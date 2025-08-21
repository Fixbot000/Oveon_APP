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
    const { imageUrls, deviceCategory } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('No images provided');
    }

    console.log(`Analyzing ${imageUrls.length} images with Gemini for ${deviceCategory}`);

    // Process images and convert to base64
    const imageParts = [];
    for (const imageUrl of imageUrls) {
      try {
        const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert to base64 in chunks to avoid stack overflow
          let base64String = '';
          const chunkSize = 8192;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
            base64String += btoa(String.fromCharCode(...Array.from(chunk)));
          }

          imageParts.push({
            inlineData: {
              data: base64String,
              mimeType: response.headers.get('content-type') || 'image/jpeg'
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to process image ${imageUrl}:`, error);
      }
    }

    if (imageParts.length === 0) {
      throw new Error('Failed to process any images');
    }

    const prompt = `You are an expert electronics repair technician. Analyze this ${deviceCategory} image carefully.

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "likelyProblems": ["problem1", "problem2", "problem3"],
  "confidence": "high|medium|low",
  "visualObservations": "What you can see in the image",
  "clarifyingQuestions": [
    "Question 1 about specific symptoms?",
    "Question 2 about when it started?",
    "Question 3 about usage patterns?",
    "Question 4 about previous repairs?",
    "Question 5 about current behavior?"
  ]
}

Identify the 1-3 most likely problems based on what you can see. Make the clarifying questions specific and helpful for diagnosis. All questions should be answerable and relevant to the visible device.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...imageParts
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error('No analysis received from Gemini');
    }

    // Extract JSON from the response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Gemini');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!analysis.likelyProblems || !Array.isArray(analysis.likelyProblems)) {
      analysis.likelyProblems = ["Hardware component issue", "Power supply problem", "Connection failure"];
    }

    if (!analysis.clarifyingQuestions || !Array.isArray(analysis.clarifyingQuestions)) {
      analysis.clarifyingQuestions = [
        "What specific symptoms are you experiencing with this device?",
        "When did you first notice this problem occurring?",
        "Does the device show any signs of power or activity?",
        "Have you attempted any troubleshooting steps so far?",
        "Are there any unusual sounds, smells, or visual indicators?"
      ];
    }

    console.log('Gemini analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gemini-image-analysis:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});