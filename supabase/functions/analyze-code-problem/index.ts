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
    const { text, fileContent, fileName }: RequestBody = await req.json();
    
    if (!text && !fileContent) {
      return new Response(JSON.stringify({ 
        error: 'Either text or file content is required.',
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

    // Prepare content for analysis
    const contentToAnalyze = fileContent || text;
    const fileInfo = fileName ? `File: ${fileName}\n\n` : '';

    // Build prompt for ChatGPT
    const prompt = `${fileInfo}Analyze the following code/schematic for problems and provide solutions:

${contentToAnalyze}

Please respond in the following structured format:

**PROBLEMS FOUND:**
- [List each problem as a bullet point]

**SUGGESTED FIXES:**
- [List each suggested fix as a bullet point]

**CORRECTED CODE/SCHEMATIC:**
\`\`\`
[Provide the corrected version of the code/schematic]
\`\`\`

Focus on syntax errors, logical issues, best practices, and potential bugs. Be specific and actionable in your suggestions.`;

    console.log('Code Analysis - Processing request for user:', userId);
    console.log('Content length:', contentToAnalyze?.length || 0);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer and electronic schematic analyst. You help identify problems in code and schematics, provide clear suggestions for fixes, and offer corrected versions. Be thorough, specific, and educational in your responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Code Analysis - Generated response length:', aiResponse.length);

    // Parse the structured response
    const parseResponse = (text: string) => {
      const problems: string[] = [];
      const suggestions: string[] = [];
      let correctedCode = '';

      const lines = text.split('\n');
      let currentSection = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.includes('PROBLEMS FOUND')) {
          currentSection = 'problems';
          continue;
        } else if (trimmed.includes('SUGGESTED FIXES')) {
          currentSection = 'suggestions';
          continue;
        } else if (trimmed.includes('CORRECTED CODE') || trimmed.includes('CORRECTED SCHEMATIC')) {
          currentSection = 'corrected';
          continue;
        }

        if (currentSection === 'problems' && trimmed.startsWith('-')) {
          problems.push(trimmed.substring(1).trim());
        } else if (currentSection === 'suggestions' && trimmed.startsWith('-')) {
          suggestions.push(trimmed.substring(1).trim());
        } else if (currentSection === 'corrected' && !trimmed.startsWith('```')) {
          if (trimmed) {
            correctedCode += line + '\n';
          }
        }
      }

      return { problems, suggestions, correctedCode: correctedCode.trim() };
    };

    const parsedResponse = parseResponse(aiResponse);

    const responseBody: ResponseBody = {
      problems: parsedResponse.problems,
      suggestions: parsedResponse.suggestions,
      correctedCode: parsedResponse.correctedCode,
      success: true
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Code Analysis error:', error);
    
    const responseBody: ResponseBody = {
      problems: [],
      suggestions: [],
      success: false,
      error: error.message || 'Unable to analyze, please try again.'
    };

    return new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});