import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper function to call OpenAI with timeout
async function callOpenAI(messages: any[], maxTokens = 1500, temperature = 0.7) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: maxTokens,
        temperature
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function to call Gemini as fallback
async function callGemini(messages: any[]) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not available');
  }
  
  // Convert messages to Gemini format
  const lastMessage = messages[messages.length - 1];
  const systemMessage = messages.find(m => m.role === 'system');
  
  const prompt = `${systemMessage?.content || ''}\n\nUser: ${lastMessage.content}`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    choices: [
      {
        message: {
          content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
        }
      }
    ]
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], imageAnalysis = null, skipQuestions = false } = await req.json();

    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      throw new Error('No AI API keys configured');
    }

    console.log('Processing text-based diagnosis:', message);

    // Enhanced conversational system prompt
    const systemPrompt = `You are an expert electronics repair assistant AI. You're conversational, helpful, and knowledgeable like ChatGPT or Gemini.

PERSONALITY:
- Be friendly, conversational, and approachable
- Use natural language, not robotic responses
- Show enthusiasm for helping with electronics repair
- Ask relevant follow-up questions when needed
- Explain complex concepts in simple terms

CAPABILITIES:
- Diagnose electronic device issues through conversation
- Provide step-by-step repair guidance
- Suggest tools and parts needed
- Offer safety warnings when necessary
- Ask contextual symptom questions based on the device/problem

INTERACTION STYLE:
- If the user describes a problem, provide immediate helpful advice
- Ask 1-2 relevant symptom questions if helpful (but make them skippable)
- Focus on practical, actionable solutions
- Reference any database matches found
- If unsure, suggest professional repair or alternative approaches

Remember: Questions are optional - if the user wants to skip symptom questions, provide direct help based on what they've shared.`;

    // Quick analysis for contextual questions
    let deviceInfo = null;
    let shouldAskQuestions = !skipQuestions && conversationHistory.length < 2;

    if (imageAnalysis) {
      deviceInfo = imageAnalysis;
    } else {
      // Quick device detection from message
      const deviceTypes = ['phone', 'laptop', 'computer', 'tablet', 'tv', 'monitor', 'speaker', 'headphones', 'router', 'modem', 'camera', 'drone', 'console', 'pcb', 'circuit', 'component'];
      const detectedDevice = deviceTypes.find(device => message.toLowerCase().includes(device));
      if (detectedDevice) {
        deviceInfo = { deviceType: detectedDevice };
      }
    }

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Keep more context for better conversation
      { role: 'user', content: message }
    ];

    // Add device context if available
    if (deviceInfo) {
      messages.push({
        role: 'system', 
        content: `Additional context: User is working with a ${deviceInfo.deviceType || 'electronic device'}. ${imageAnalysis ? 'Image analysis results available.' : 'No image analysis.'}`
      });
    }

    let aiResponse;
    let usedFallback = false;

    // Try OpenAI first, fallback to Gemini if it fails or times out
    try {
      if (OPENAI_API_KEY) {
        console.log('Calling OpenAI API...');
        const data = await callOpenAI(messages);
        aiResponse = data.choices[0].message.content;
        console.log('OpenAI response received successfully');
      } else {
        throw new Error('OpenAI not available');
      }
    } catch (error) {
      console.warn('OpenAI failed, trying Gemini fallback:', error.message);
      try {
        const data = await callGemini(messages);
        aiResponse = data.choices[0].message.content;
        usedFallback = true;
        console.log('Gemini fallback response received successfully');
      } catch (geminiError) {
        console.error('Both OpenAI and Gemini failed');
        throw new Error('AI services temporarily unavailable. Please try again.');
      }
    }

    // Search database for relevant matches
    let databaseMatches = [];
    if (deviceInfo && deviceInfo.deviceType) {
      try {
        const matchResponse = await supabase.functions.invoke('database-matcher', {
          body: { 
            aiAnalysis: {
              deviceType: deviceInfo.deviceType,
              specifications: deviceInfo.specifications || {},
              visibleIssues: deviceInfo.symptoms || []
            }, 
            deviceCategory: deviceInfo.deviceCategory || 'device'
          }
        });

        if (!matchResponse.error) {
          databaseMatches = matchResponse.data || [];
        }
      } catch (error) {
        console.warn('Database search failed:', error);
      }
    }

    // Generate contextual symptom questions if appropriate
    let followUpQuestions = [];
    if (shouldAskQuestions && deviceInfo && !skipQuestions) {
      const questionPrompts = {
        phone: ["Is the screen responsive to touch?", "Does it charge when plugged in?", "Are there any visible cracks or damage?"],
        laptop: ["Does it power on at all?", "Can you see anything on the screen?", "Do you hear any fans or sounds when you press power?"],
        tv: ["Is there any picture or just a black screen?", "Do you see any lights on the TV?", "Does it respond to the remote?"],
        pcb: ["Are there any visible burnt components?", "Do you smell anything unusual?", "Where exactly is the damage located?"],
        circuit: ["Are there any loose connections?", "Have you tested voltage at key points?", "When did the problem first occur?"]
      };
      
      const deviceType = deviceInfo.deviceType.toLowerCase();
      followUpQuestions = questionPrompts[deviceType] || ["When did this problem start?", "Have you tried any troubleshooting steps?"];
    }

    console.log(`Text diagnosis completed successfully using ${usedFallback ? 'Gemini' : 'OpenAI'}`);

    return new Response(JSON.stringify({
      response: aiResponse,
      databaseMatches: databaseMatches.length,
      hasMatches: databaseMatches.length > 0,
      followUpQuestions,
      usedFallback,
      canSkipQuestions: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in text-diagnosis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having trouble processing your request right now. Please try again in a moment or describe your device issue and I'll do my best to help!"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});