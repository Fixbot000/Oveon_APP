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
    const { description, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!description) {
      return new Response(JSON.stringify({
        error: 'Circuit description is required.',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Premium feature check (assuming circuit generation is also a protected feature)
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

    const prompt = `Generate a detailed circuit design based on the following description. Provide:
- A concise Circuit Summary.
- A Components List (e.g., Resistor 1kΩ, LED Red, 9V Battery).
- Connection/Working Details explaining how the components are connected and how the circuit functions.
- A Logic Table, if the circuit is digital or involves logical operations.
- An ASCII/Text-based Circuit Diagram, clearly illustrating the connections.

Ensure all parts are clearly labeled and well-formatted. Preserve newlines and spacing for the ASCII diagram.

Circuit Description: ${description}

Respond entirely in a single JSON object with the following keys: "Circuit Summary", "Components List", "Connection/Working Details", "Logic Table", "ASCII/Text-based Circuit Diagram".
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();
    
    // Log the full Gemini API response for debugging
    console.log('Full Gemini API response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('Gemini API error (non-2xx response):', data);
      throw new Error(data.error?.message || 'Failed to generate circuit from Gemini API');
    }

    const geminiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!geminiResponseText) {
      throw new Error('No response generated from Gemini API');
    }

    // Attempt to parse the Gemini response as JSON
    let circuitDetails;
    try {
      circuitDetails = JSON.parse(geminiResponseText);
    } catch (parseError) {
      console.error('Error parsing Gemini response as JSON:', parseError);
      // If parsing fails, return the raw text as a general summary or error
      return new Response(JSON.stringify({
        error: "Failed to parse Gemini API response. Raw response: " + geminiResponseText,
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ result: circuitDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generateCircuit edge function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.', success: false }), {
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
