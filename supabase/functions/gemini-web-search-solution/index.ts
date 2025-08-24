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

    // Use Gemini directly to generate repair solutions
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on the detailed analysis and user information, provide a CONCISE repair solution for this electronic device problem:

**Problem Analysis:** ${finalAnalysis}

**User Responses:** ${JSON.stringify(allAnswers, null, 2)}

**Device Type:** ${deviceType || 'Electronic Device'}

IMPORTANT: Keep the solution SHORT and ACTIONABLE. Follow these rules:
- Use bullet points or numbered steps
- Maximum 5 steps total
- Each step under 15 words
- If complex, provide 2-3 line summary + ask ONE follow-up question
- Focus on most likely solution first

Format:
## Quick Solution:
• Step 1: [action under 15 words]
• Step 2: [action under 15 words]
• Step 3: [action under 15 words]
• Step 4: [action under 15 words]
• Step 5: [action under 15 words]

## Required: [brief tools/parts list]

## Safety: [one key warning]

If issue is complex, provide short summary and ask ONE clarifying question instead.`
          }]
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