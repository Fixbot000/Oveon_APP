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
    const { imageBase64, deviceName } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
            text: `Analyze this image of a ${deviceName || 'device'} for any type of damage or issues. Check for:
- Physical damage (cracks, dents, broken parts, scratches)
- Dust, dirt, corrosion, or buildup
- Signs of overheating (burn marks, melted areas, discoloration)
- Loose or disconnected wires/connectors
- Missing components or screws
- Misalignment of parts
- Any other visible problems specific to ${deviceName || 'this type of device'}

IMPORTANT: Keep the analysis SHORT and ACTIONABLE. Follow these rules:
- Use bullet points for issues found
- Maximum 5 key issues
- Each issue under 15 words
- Focus on most critical problems first
- If complex, provide brief summary

Format:
## Issues Found:
• Issue 1: [description under 15 words]
• Issue 2: [description under 15 words]
• Issue 3: [description under 15 words]

## Likely Cause: [brief explanation]`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64.split(',')[1]
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze image');
    }

    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

    // Generate relevant follow-up questions based on the analysis
    const questionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on this analysis of a ${deviceName || 'device'}: "${analysis}"

Generate 3-5 specific, relevant questions that would help get more details about the problems identified with this ${deviceName || 'device'}. Questions should be:
- Directly related to the issues found in the image
- Specific to ${deviceName || 'this type of device'} and its common problems
- Helpful for determining the exact cause or solution
- Clear and easy to answer
- Focus on symptoms, when the problem started, usage patterns

Format as a simple JSON array of strings.`
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
      questions = [
        "When did you first notice this problem?",
        "Does the device still work despite the visible issues?",
        "Have you tried any repairs or cleaning?"
      ];
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