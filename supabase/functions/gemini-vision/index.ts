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
    // Validate auth token (JWT verification is handled by Supabase)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { imageUrls, symptomsText, deviceCategory } = await req.json();

    // Input validation
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid imageUrls' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Analyzing images with Gemini Vision...');

    // Prepare images for Gemini API
    const imageParts = [];
    for (const imageUrl of imageUrls) {
      try {
        // Fetch image data
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
    You are an expert electronics repair technician. Analyze the provided images of electronic ${deviceCategory || 'device'} and provide detailed technical analysis.

    ${symptomsText ? `User reported symptoms: ${symptomsText}` : ''}

    Please provide a comprehensive analysis including:
    1. Device/component identification
    2. Visible issues or damage
    3. Potential causes of problems
    4. Component specifications if identifiable
    5. Safety considerations
    6. Diagnostic recommendations

    Format your response as JSON with the following structure:
    {
      "deviceType": "identified device/component name",
      "condition": "overall condition assessment",
      "visibleIssues": ["list of visible problems"],
      "potentialCauses": ["list of potential root causes"],
      "specifications": {
        "brand": "if identifiable",
        "model": "if identifiable",
        "voltage": "if visible",
        "power": "if visible"
      },
      "safetyWarnings": ["important safety considerations"],
      "diagnosticSteps": ["recommended diagnostic procedures"],
      "confidence": 0.85
    }
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
        maxOutputTokens: 2048,
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
      // Clean up the response text to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from text
        analysis = {
          deviceType: "Unknown device",
          condition: "Analysis completed",
          visibleIssues: [],
          potentialCauses: [],
          specifications: {},
          safetyWarnings: [],
          diagnosticSteps: [],
          confidence: 0.5,
          rawAnalysis: analysisText
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON response, using fallback structure');
      analysis = {
        deviceType: "Unknown device",
        condition: "Analysis completed",
        visibleIssues: [],
        potentialCauses: [],
        specifications: {},
        safetyWarnings: [],
        diagnosticSteps: [],
        confidence: 0.5,
        rawAnalysis: analysisText
      };
    }

    console.log('Gemini vision analysis completed successfully');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gemini-vision function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});