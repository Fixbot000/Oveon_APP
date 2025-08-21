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
            text: `Based on the detailed analysis and user information, provide a comprehensive repair solution for this electronic device problem:

**Problem Analysis:** ${finalAnalysis}

**User Responses:** ${JSON.stringify(allAnswers, null, 2)}

**Device Type:** ${deviceType || 'Electronic Device'}

Please provide a detailed repair solution with the following sections:

## 1. Problem Summary
Brief overview of the identified issues and root causes.

## 2. Required Tools
List specific tools needed for the repair (screwdrivers, compressed air, thermal paste, etc.).

## 3. Required Parts
Any replacement parts that might be needed with approximate specifications.

## 4. Step-by-Step Repair Instructions
Detailed, numbered steps for the repair process. Be specific and clear.

## 5. Safety Warnings
Important safety considerations and precautions to take.

## 6. Testing and Verification
How to test the device after repair to ensure it's working properly.

## 7. Prevention Tips
How to avoid this problem in the future.

## 8. When to Seek Professional Help
Indicators that professional repair might be necessary.

Make the solution practical, safe, and based on standard electronic repair practices. Focus on the most likely solutions first.`
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