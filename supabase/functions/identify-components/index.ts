import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndIdentify } from '../helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
  };
  return languages[code] || 'English';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, deviceName, language = 'en' } = await req.json();
    
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    
    // Check premium status and daily limit

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration not found");
    }

    if (!apiKey) {
      throw new Error("Gemini API key not found");
    }

    // Premium feature check - use the new checkPremiumAndIdentify function
    const { allowed, error: premiumError } = await checkPremiumAndIdentify(userId, supabaseKey, supabaseUrl);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: premiumError || 'Identify limit exceeded. Please upgrade to premium for unlimited identifies.',
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
              text: `Analyze this image of a ${deviceName || 'electronic component'} to identify the component and describe its common uses and applications. Provide your response in ${getLanguageName(language)}. Check for:
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

    // Extract components from the analysis
    const componentRegex = /• Name: ([^\n]+)/g;
    const components = [];
    let match;
    while ((match = componentRegex.exec(analysis)) !== null) {
      components.push({ name: match[1].trim() });
    }

    // Return the analysis and components
    return new Response(JSON.stringify({ 
      overallSuggestion: analysis,
      components: components
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