import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndScans } from "../helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, deviceName, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL or key not found");
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization required',
        success: false
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    // Premium feature check
    const { allowed, error: premiumError } = await checkPremiumAndScans(userId, supabaseKey, supabaseUrl);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: premiumError || 'Premium feature check failed.',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
            text: `Analyze this image of a ${deviceName || 'component'} to identify the component and describe its common uses and applications. Provide your response in ${getLanguageName(language)}. Check for:
- Component name and type
- Primary function
- Common applications or circuits it's used in
- Any notable features or characteristics

IMPORTANT: Keep the analysis SHORT and ACTIONABLE. Follow these rules:
- Use bullet points for component details
- Maximum 5 key details
- Each detail under 20 words
- Focus on identification and common uses
- If complex, provide a brief summary
- Respond entirely in ${getLanguageName(language)}

Format:
## Component Identification:
• Name: [component name and type in ${getLanguageName(language)}]
• Function: [primary function in ${getLanguageName(language)}]
• Uses: [common applications in ${getLanguageName(language)}]
• Features: [notable features in ${getLanguageName(language)}]`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64.split(',')[1]
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error (non-2xx response):', data);
      throw new Error(data.error?.message || 'Failed to analyze image with Gemini API');
    }

    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
    console.log('Gemini analysis result:', analysis);

    // Generate relevant follow-up questions based on the analysis
    const questionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on this component analysis of a ${deviceName || 'component'}: "${analysis}"

Generate 3-5 specific, relevant questions that would help get more details about the identified component and its uses. Questions should be:
- Directly related to the component identified
- Specific to this type of component and its common applications
- Helpful for understanding its functionality or potential troubleshooting
- Clear and easy to answer
- Focus on specifications, alternative uses, or common problems
- Written entirely in ${getLanguageName(language)}

Format as a simple JSON array of strings in ${getLanguageName(language)}.`
          }]
        }]
      })
    });

    const questionData = await questionResponse.json();
    let questions = [];
    
    if (!questionResponse.ok) {
      console.error('Gemini API error (questions, non-2xx response):', questionData);
      // Fallback to default questions if API fails
      questions = [
        "When did you first notice this problem?",
        "Does the device still work despite the visible issues?",
        "Have you tried any repairs or cleaning?"
      ];
    } else {
      try {
        const questionText = questionData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        questions = JSON.parse(questionText.replace(/```json\n?/g, '').replace(/```/g, ''));
      } catch (e) {
        console.error('Error parsing questions:', e);
        questions = [
          "When did you first notice this problem?",
          "Does the device still work despite the visible issues?",
          "Have you tried any repairs or cleaning?"
        ];
      }
    }

    return new Response(JSON.stringify({ 
      analysis,
      questions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in identify-components edge function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)', 
    'de': 'German (Deutsch)',
    'it': 'Italian (Italiano)',
    'pt': 'Portuguese (Português)',
    'ru': 'Russian (Русский)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'zh': 'Chinese (中文)',
    'ar': 'Arabic (العربية)',
    'hi': 'Hindi (हिन्दी)'
  };
  return languages[code] || 'English';
}