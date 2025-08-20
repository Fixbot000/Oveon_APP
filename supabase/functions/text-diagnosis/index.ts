import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Processing text-based diagnosis:', message);

    // First, analyze the user's message to extract device info and symptoms
    const analysisPrompt = `
    You are an expert electronics repair technician. Analyze this user message and extract:
    1. Device type and category
    2. Symptoms and issues described
    3. Any specific models or brands mentioned
    
    User message: "${message}"
    
    Respond with JSON in this format:
    {
      "deviceCategory": "device|instrument|component|pcb|board",
      "deviceType": "specific device name if mentioned",
      "symptoms": ["list of symptoms"],
      "brands": ["any brands mentioned"],
      "models": ["any models mentioned"],
      "needsMoreInfo": true/false,
      "followUpQuestions": ["questions to ask if more info needed"]
    }
    `;

    // Get initial analysis
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert electronics repair technician.' },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!analysisResponse.ok) {
      throw new Error(`OpenAI API error: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    let analysis;
    
    try {
      const analysisText = analysisData.choices[0].message.content;
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (parseError) {
      console.warn('Failed to parse analysis JSON');
      analysis = null;
    }

    // If we have enough info, search the database
    let databaseMatches = [];
    if (analysis && analysis.deviceCategory && !analysis.needsMoreInfo) {
      console.log('Searching database for matches...');
      
      try {
        const matchResponse = await supabase.functions.invoke('database-matcher', {
          body: { 
            aiAnalysis: {
              deviceType: analysis.deviceType,
              specifications: {
                brand: analysis.brands?.[0],
                model: analysis.models?.[0]
              },
              visibleIssues: analysis.symptoms
            }, 
            deviceCategory: analysis.deviceCategory 
          }
        });

        if (!matchResponse.error) {
          databaseMatches = matchResponse.data || [];
        }
      } catch (error) {
        console.warn('Database search failed:', error);
      }
    }

    // Generate the response
    const systemPrompt = `You are a friendly, expert electronics repair assistant. 
    You help users diagnose and repair electronic devices through conversation.
    
    Guidelines:
    - Be conversational and helpful
    - Ask follow-up questions when you need more information
    - Provide specific, actionable advice when possible
    - Always prioritize safety
    - Reference database matches when available
    - If you can't help with the specific issue, suggest professional repair services`;

    let contextPrompt = `User message: "${message}"`;
    
    if (analysis) {
      contextPrompt += `\n\nExtracted information:
      - Device Category: ${analysis.deviceCategory}
      - Device Type: ${analysis.deviceType || 'Not specified'}
      - Symptoms: ${analysis.symptoms?.join(', ') || 'None specified'}
      - Brands: ${analysis.brands?.join(', ') || 'None mentioned'}
      - Models: ${analysis.models?.join(', ') || 'None mentioned'}`;
    }

    if (databaseMatches.length > 0) {
      contextPrompt += `\n\nDatabase matches found (${databaseMatches.length} results):`;
      databaseMatches.slice(0, 3).forEach((match, index) => {
        contextPrompt += `\n\nMatch ${index + 1} (confidence: ${match.confidence}):`;
        contextPrompt += `\n${JSON.stringify(match.record, null, 2)}`;
      });
    }

    // Build conversation context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: contextPrompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Text diagnosis completed successfully');

    return new Response(JSON.stringify({
      response: aiResponse,
      analysis: analysis,
      databaseMatches: databaseMatches.length,
      hasMatches: databaseMatches.length > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in text-diagnosis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having trouble processing your request right now. Please try again or consider using the image diagnosis feature for more detailed analysis."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});