import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://byte-fixer.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls, deviceCategory } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid imageUrls' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Performing initial image analysis...');

    // Prepare images for Gemini API
    const imageParts = [];
    for (const imageUrl of imageUrls) {
      try {
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        
        imageParts.push({
          inlineData: {
            data: base64Image,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        });
      } catch (error) {
        console.warn(`Failed to fetch image ${imageUrl}:`, error);
      }
    }

    const prompt = `
    You are an expert electronics repair technician. Analyze the provided images of this ${deviceCategory || 'electronic device'} and identify the most likely problem based on visual inspection.

    Please provide:
    1. A brief analysis of what you see in the images
    2. The most likely problem based on visual clues
    3. Exactly 5 specific confirmation questions to verify your assessment (not generic questions)

    Format your response as JSON with this exact structure:
    {
      "visualAnalysis": "brief description of what you observe in the images",
      "likelyProblem": "the most probable issue based on visual inspection",
      "confirmationQuestions": [
        "Specific question 1 based on your analysis?",
        "Specific question 2 based on your analysis?",
        "Specific question 3 based on your analysis?",
        "Specific question 4 based on your analysis?",
        "Specific question 5 based on your analysis?"
      ]
    }

    Make sure the confirmation questions are:
    - Specific to what you see in the images
    - Designed to confirm or refine your initial assessment
    - Not generic troubleshooting questions
    - Answerable by the user who has the device
    `;

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          ...imageParts
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const analysisText = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response
        analysis = {
          visualAnalysis: "Unable to parse detailed analysis from AI response",
          likelyProblem: "Analysis completed but requires manual interpretation",
          confirmationQuestions: [
            "Does the device show any signs of physical damage?",
            "Are there any visible burn marks or discoloration?",
            "Do you notice any loose or disconnected components?",
            "Are there any unusual sounds when you try to use the device?",
            "Does the device respond at all when you attempt to power it on?"
          ]
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON response, using fallback structure');
      analysis = {
        visualAnalysis: analysisText.substring(0, 200) + "...",
        likelyProblem: "Analysis requires further investigation",
        confirmationQuestions: [
          "Does the device show any signs of physical damage?",
          "Are there any visible burn marks or discoloration?",
          "Do you notice any loose or disconnected components?",
          "Are there any unusual sounds when you try to use the device?",
          "Does the device respond at all when you attempt to power it on?"
        ]
      };
    }

    console.log('Initial image analysis completed successfully');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in initial-image-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});