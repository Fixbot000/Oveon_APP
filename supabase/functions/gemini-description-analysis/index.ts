import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, deviceCategory, imageAnalysis } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    if (!description || description.trim().length === 0) {
      throw new Error('No description provided');
    }

    console.log('Generating description-based questions with Gemini');

    // Clean up description - ignore typos, caps, formatting
    const cleanDescription = description.trim().toLowerCase();

    const prompt = `You are an expert electronics repair technician. Based on this user description of their ${deviceCategory} problem, generate follow-up questions to make the diagnosis more accurate.

User Description: "${description}"

Previous Image Analysis: ${imageAnalysis ? JSON.stringify(imageAnalysis) : 'None available'}

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "followUpQuestions": [
    "Specific question 1?",
    "Specific question 2?", 
    "Specific question 3?",
    "Specific question 4?",
    "Specific question 5?"
  ]
}

Requirements:
- Generate 4-6 specific follow-up questions based on the description
- Questions should help narrow down the exact cause
- Make questions simple and answerable by a non-technical user  
- Focus on symptoms, timing, patterns, and user actions
- Avoid yes/no questions when possible
- Ignore any typos or formatting issues in the description`;

    console.log('Calling Gemini API for description analysis');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          }
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response received from Gemini');
    }

    console.log('Gemini response received, parsing JSON');

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Gemini');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!result.followUpQuestions || !Array.isArray(result.followUpQuestions) || result.followUpQuestions.length === 0) {
      result.followUpQuestions = [
        "Can you describe the exact symptoms in more detail?",
        "When did this problem first occur?",
        "Does the issue happen consistently or intermittently?",
        "What were you doing when the problem started?",
        "Have you noticed any patterns to when it occurs?"
      ];
    }

    console.log('Description-based questions generated successfully');

    return new Response(JSON.stringify({
      success: true,
      questions: result.followUpQuestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gemini-description-analysis:', error);
    
    // Always provide fallback questions to never fail
    const fallbackQuestions = [
      "What specific symptoms or behaviors are you observing?",
      "When did you first notice this issue occurring?",
      "Does the problem happen every time you use the device?",
      "Are there any error messages or warning indicators?",
      "What troubleshooting steps have you already tried?",
      "Does the issue occur under specific conditions?"
    ];

    return new Response(JSON.stringify({
      success: true,
      questions: fallbackQuestions,
      usedFallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});