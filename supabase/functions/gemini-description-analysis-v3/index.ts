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

    console.log('Analyzing description with Gemini for refined problem identification');

    // Clean up description - ignore typos, caps, formatting
    const cleanDescription = description.trim().toLowerCase();

    const prompt = `You are an expert problem diagnostic assistant. Based on this user description of their ${deviceCategory} problem, refine and expand the problem identification.

User Description: "${description}"

Previous Image Analysis: ${imageAnalysis ? JSON.stringify(imageAnalysis) : 'None available'}

Analyze the description systematically:
- Look for keywords indicating specific problems
- Identify symptoms mentioned
- Note any patterns or timing information
- Consider user actions that might have caused the issue
- Cross-reference with image analysis if available

Ignore typos, capitalization mistakes, and formatting errors in the description.

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "refinedProblems": [
    {
      "label": "Refined problem name",
      "reasoning": "Why this problem fits the description",
      "confidence": "high|medium|low"
    }
  ],
  "additionalQuestions": [
    "Specific question 1 based on description?",
    "Specific question 2 based on description?",
    "Specific question 3 based on description?"
  ],
  "keySymptoms": ["symptom1", "symptom2", "symptom3"],
  "analysisNotes": "Summary of key insights from the description"
}`;

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
    if (!result.refinedProblems || !Array.isArray(result.refinedProblems) || result.refinedProblems.length === 0) {
      result.refinedProblems = [{
        label: "Problem based on description",
        reasoning: "Analysis based on user's description of the issue",
        confidence: "medium"
      }];
    }

    if (!result.additionalQuestions || !Array.isArray(result.additionalQuestions)) {
      result.additionalQuestions = [
        "Can you describe the exact symptoms in more detail?",
        "When did this problem first occur?",
        "Does the issue happen consistently or intermittently?"
      ];
    }

    if (!result.keySymptoms || !Array.isArray(result.keySymptoms)) {
      result.keySymptoms = ["user reported issue"];
    }

    if (!result.analysisNotes) {
      result.analysisNotes = "Analysis completed based on user description";
    }

    console.log('Description analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gemini-description-analysis-v3:', error);
    
    // Always provide fallback analysis to never fail
    const fallbackAnalysis = {
      refinedProblems: [{
        label: "Issue based on description",
        reasoning: "Analysis completed despite processing challenges",
        confidence: "low"
      }],
      additionalQuestions: [
        "What specific symptoms or behaviors are you observing?",
        "When did you first notice this issue occurring?",
        "Does the problem happen every time you use the device?"
      ],
      keySymptoms: ["user reported problem"],
      analysisNotes: "Fallback analysis completed - please provide more details if possible"
    };

    return new Response(JSON.stringify({
      success: true,
      analysis: fallbackAnalysis,
      usedFallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});