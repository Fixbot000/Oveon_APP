import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  text?: string;
  fileContent?: string;
  fileName?: string;
}

interface ResponseBody {
  problems: string[];
  suggestions: string[];
  correctedCode?: string;
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

    // Extract user ID from JWT
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    // Check scan limits using existing RPC function
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase URL or service role key not found");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Use the existing RPC function to check and increment scan count
    const { data: scanResult, error: scanError } = await supabase.rpc('increment_scan_if_allowed', {
      p_user_id: userId,
      p_check: false  // Actually increment the scan count
    });

    if (scanError || !scanResult?.success) {
      return new Response(JSON.stringify({ 
        error: scanResult?.error || 'Scan limit exceeded. Please upgrade to premium for unlimited scans.',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { description, files }: { description: string; files: string } = await req.json();
    
    if (!description) {
      return new Response(JSON.stringify({ 
        error: 'Description is required.',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Gemini API key from environment
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Build prompt for Gemini to generate clarifying questions
    const prompt = `Analyze this technical problem and generate 3-5 clarifying questions to better understand the issue:

Problem Description: ${description}

${files ? `Additional Files/Code: ${files}` : ''}

Generate specific, technical questions that will help diagnose the problem accurately. Focus on:
- What exactly is happening vs what should happen
- When the problem occurs (conditions, timing)
- Any error messages or symptoms
- What troubleshooting has been attempted
- Environmental factors (hardware, software versions, etc.)

Provide only a JSON array of questions, no other text:
["Question 1?", "Question 2?", "Question 3?"]`;

    console.log('Generating clarifying questions for user:', userId);

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      throw new Error('No response from Gemini API');
    }

    console.log('Generated questions response length:', aiResponse.length);

    try {
      // Try to parse JSON response
      const questions = JSON.parse(aiResponse);
      if (Array.isArray(questions)) {
        return new Response(JSON.stringify({ questions, success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Parse error, using fallback questions:', parseError);
      
      // Fallback questions
      const fallbackQuestions = [
        "What specific error message or symptom are you experiencing?",
        "When did this problem first start occurring?",
        "What steps have you already tried to resolve this issue?",
        "Are there any recent changes to your system or environment?",
        "Can you reproduce this problem consistently?"
      ];
      
      return new Response(JSON.stringify({ 
        questions: fallbackQuestions, 
        success: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Question generation error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Unable to generate questions, please try again.',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});