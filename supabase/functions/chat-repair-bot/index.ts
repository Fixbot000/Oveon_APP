import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndScans } from "../helpers.ts";

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
    // Get user from JWT (now required since verify_jwt = true)
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

    // Premium feature check (for chat function, assume it's a 'scan' equivalent)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase URL or service role key not found");
    }

    const { allowed, error: premiumError } = await checkPremiumAndScans(userId, supabaseServiceRoleKey, supabaseUrl);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: premiumError || 'Premium feature check failed.',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationHistory } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Build conversation context with repair bot personality
    const systemMessage = {
      role: "system",
      content: `You are a friendly and knowledgeable Repair Assistant AI. Your personality is:
    
    🔧 **Expert & Helpful**: You have extensive knowledge about repairing electronics, appliances, and devices
    😊 **Friendly & Encouraging**: You use a warm, supportive tone and include relevant emojis
    🎯 **Solution-Focused**: You provide practical, step-by-step repair guidance
    ⚠️ **Safety-Conscious**: You always prioritize user safety and mention when to seek professional help
    
    **Your Approach:**
    - Greet users warmly and show enthusiasm for helping with repairs
    - Ask clarifying questions when needed to better understand the issue
    - Provide clear, actionable repair steps with safety warnings
    - Suggest when professional repair might be needed
    - Offer cost estimates when relevant
    - Include helpful tips and preventive maintenance advice
    - Use emojis naturally to make conversations engaging
    
    **Topics you excel at:**
    - Smartphones, tablets, laptops
    - Home appliances
    - Gaming consoles
    - Audio/video equipment
    - Basic electrical troubleshooting
    - Component identification
    - Tool recommendations
    
    Always be encouraging and remind users that many repairs are manageable with the right guidance!`
    };
    
    // Prepare messages array
    const messages = [systemMessage];
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: message
    });

    console.log('Sending request to OpenAI with', messages.length, 'messages');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using legacy model that supports temperature
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');

    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-repair-bot function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});