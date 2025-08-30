import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndScans } from "../helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lovable.dev, https://lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting helper
async function checkRateLimit(userId: string, functionName: string): Promise<boolean> {
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseServiceRoleKey || !supabaseUrl) {
    console.error("Supabase URL or key not found for rate limit check.");
    return true; // Allow on error
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Get current hour window
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  
  // Check/update usage
  const { data, error } = await supabase
    .from('function_usage')
    .upsert({
      user_id: userId,
      function_name: functionName,
      window_start: windowStart.toISOString(),
      count: 1
    }, { onConflict: 'user_id,function_name,window_start' })
    .select('count')
    .single();

  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error
  }

  // Check if under limit (100 calls per hour)
  return data?.count <= 100;
}

interface RequestBody {
  prompt: string;
}

interface ResponseBody {
  reply: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed. Use POST.',
        success: false 
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Extract user ID from JWT (simplified - in production, properly verify JWT)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    // Premium feature check
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

    // Rate limiting (still apply a general rate limit for premium users to prevent abuse, or remove if truly unlimited)
    const withinLimit = await checkRateLimit(userId, 'ai-helper');
    if (!withinLimit) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        success: false 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { prompt }: RequestBody = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Invalid request body. "prompt" field is required and must be a string.',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    const responseBody: ResponseBody = {
      reply: aiReply,
      success: true
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Helper error:', error);
    
    const responseBody: ResponseBody = {
      reply: '',
      success: false,
      error: error.message
    };

    return new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
