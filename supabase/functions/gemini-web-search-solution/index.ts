import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { finalAnalysis, allAnswers, deviceType } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const searchQuery = `How to repair ${deviceType || 'device'} ${finalAnalysis.slice(0, 200)} step by step guide`;

    // Use Gemini with web search to find repair solutions
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Search the web and provide a comprehensive repair solution for this problem:

Problem Analysis: ${finalAnalysis}
User Answers: ${JSON.stringify(allAnswers)}
Device Type: ${deviceType || 'Unknown'}

Please search for current repair guides, tutorials, and solutions. Provide:

1. **Problem Summary**: Brief overview of the identified issues
2. **Required Tools**: List of tools needed for the repair
3. **Required Parts**: Any replacement parts that might be needed
4. **Step-by-Step Solution**: Detailed repair instructions
5. **Safety Warnings**: Important safety considerations
6. **Alternative Solutions**: If multiple repair approaches exist
7. **Prevention Tips**: How to avoid this problem in the future

Make sure the solution is practical, safe, and based on current repair practices found online.`
          }]
        }],
        tools: [{
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: "MODE_DYNAMIC",
              dynamic_threshold: 0.7
            }
          }
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to search for solution');
    }

    const solution = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No solution found';

    return new Response(JSON.stringify({ 
      solution,
      searchQuery
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