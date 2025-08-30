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
            text: `Analyze this image of a ${deviceName || 'device'} for any type of damage or issues and provide your response in ${getLanguageName(language)}. Check for:
- Physical damage (cracks, dents, broken parts, scratches)
- Dust, dirt, corrosion, or buildup
- Signs of overheating (burn marks, melted areas, discoloration)
- Loose or disconnected wires/connectors
- Missing components or screws
- Misalignment of parts
- Any other visible problems specific to ${deviceName || 'this type of device'}

IMPORTANT: Keep the analysis SHORT and ACTIONABLE. Follow these rules:
- Use bullet points for issues found
- Maximum 5 key issues
- Each issue under 15 words
- Focus on most critical problems first
- If complex, provide brief summary
- Respond entirely in ${getLanguageName(language)}

Format:
## Issues Found:
• Issue 1: [description under 15 words in ${getLanguageName(language)}]
• Issue 2: [description under 15 words in ${getLanguageName(language)}]
• Issue 3: [description under 15 words in ${getLanguageName(language)}]

## Likely Cause: [brief explanation in ${getLanguageName(language)}]`
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
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze image');
    }

    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

    // Generate relevant follow-up questions based on the analysis
    const questionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on this analysis of a ${deviceName || 'device'}: "${analysis}"

Generate 3-5 specific, relevant questions that would help get more details about the problems identified with this ${deviceName || 'device'}. Questions should be:
- Directly related to the issues found in the image
- Specific to ${deviceName || 'this type of device'} and its common problems
- Helpful for determining the exact cause or solution
- Clear and easy to answer
- Focus on symptoms, when the problem started, usage patterns
- Written entirely in ${getLanguageName(language)}

Format as a simple JSON array of strings in ${getLanguageName(language)}.`
          }]
        }]
      })
    });

    const questionData = await questionResponse.json();
    let questions = [];
    
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

    return new Response(JSON.stringify({ 
      analysis,
      questions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
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