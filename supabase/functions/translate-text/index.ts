import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, fromLanguage, toLanguage, context } = await req.json();

    if (!text || !fromLanguage || !toLanguage) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If same language, return original text
    if (fromLanguage === toLanguage) {
      return new Response(
        JSON.stringify({ translatedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Language code to name mapping
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil', 
      'te': 'Telugu',
      'kn': 'Kannada',
      'bn': 'Bengali'
    };

    const fromLangName = languageNames[fromLanguage] || fromLanguage;
    const toLangName = languageNames[toLanguage] || toLanguage;

    // Create context-specific system prompt
    let systemPrompt = '';
    if (context === 'user_input') {
      systemPrompt = `You are a professional translator. Translate the following ${fromLangName} text to ${toLangName}. 
      This is user input about device problems or repair issues. Maintain technical accuracy and preserve meaning.
      Return only the translated text, no explanations.`;
    } else if (context === 'ai_response') {
      systemPrompt = `You are a professional translator. Translate the following ${fromLangName} text to ${toLangName}.
      This is technical repair guidance and diagnostic information. Maintain technical accuracy and clarity.
      Return only the translated text, no explanations.`;
    } else {
      systemPrompt = `You are a professional translator. Translate the following ${fromLangName} text to ${toLangName}.
      Maintain accuracy and meaning. Return only the translated text, no explanations.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      throw new Error('Translation API error');
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim() || text;

    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed', translatedText: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});