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
    const { description, previousAnalysis, questionAnswers } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const context = `
Previous image analysis: ${previousAnalysis}
Question answers: ${questionAnswers ? JSON.stringify(questionAnswers) : 'None provided'}
User description: ${description}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this additional context and description to refine the problem diagnosis:

${context}

IMPORTANT: Keep the analysis SHORT and ACTIONABLE. Follow these rules:
- Use bullet points for key findings
- Maximum 5 key points
- Each point under 15 words
- Focus on most likely causes
- If complex, provide brief summary

Format:
## Updated Analysis:
• Finding 1: [description under 15 words]
• Finding 2: [description under 15 words]
• Finding 3: [description under 15 words]

## Root Cause: [brief explanation under 20 words]

Based on all this information, provide additional clarifying questions (if needed) to pinpoint the exact issue and solution.`
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze description');
    }

    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

    // Generate follow-up questions based on description analysis
    const questionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on this refined analysis: "${analysis}"

Generate 2-4 specific follow-up questions that would help determine the exact repair steps needed. Questions should focus on:
- Confirming the suspected root cause
- Understanding the severity/extent of damage
- Determining what tools or parts might be needed
- Clarifying any remaining uncertainties

Format as a simple JSON array of strings. If no additional questions are needed, return an empty array.`
          }]
        }]
      })
    });

    const questionData = await questionResponse.json();
    let questions = [];
    
    try {
      const questionText = questionData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      questions = JSON.parse(questionText.replace(/```json\n?/g, '').replace(/```/g, ''));
    } catch (e) {
      console.error('Error parsing questions:', e);
      questions = [];
    }

    return new Response(JSON.stringify({ 
      analysis,
      questions 
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