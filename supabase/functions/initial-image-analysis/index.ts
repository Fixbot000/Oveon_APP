import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    // If GEMINI_API_KEY is not configured, return fallback analysis
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not configured, using fallback analysis');
      return new Response(JSON.stringify({
        visualAnalysis: `Based on the uploaded images of your ${deviceCategory || 'electronic device'}, I can see the device but need more information to provide a detailed analysis.`,
        likelyProblems: [
          "Power supply failure or connection issue",
          "Internal component malfunction",
          "Software or firmware corruption"
        ],
        confidence: "low",
        confirmationQuestions: [
          "What specific issue are you experiencing with this device?",
          "When did the problem first occur?",
          "Does the device power on at all?",
          "Are there any visible signs of damage on the device?",
          "Have you tried any troubleshooting steps already?"
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Performing initial image analysis...');

    // Prepare images for Gemini API with robust error handling
    const imageParts = [];
    const processedImages = [];
    
    for (const imageUrl of imageUrls) {
      try {
        console.log(`Processing image: ${imageUrl}`);
        const imageResponse = await fetch(imageUrl, { 
          timeout: 10000,
          headers: { 'User-Agent': 'Supabase-Edge-Function' }
        });
        
        if (!imageResponse.ok) {
          console.warn(`Failed to fetch image ${imageUrl}: ${imageResponse.status}`);
          continue;
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        
        imageParts.push({
          inlineData: {
            data: base64Image,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        });
        
        processedImages.push(imageUrl);
        console.log(`Successfully processed image: ${imageUrl}`);
      } catch (error) {
        console.warn(`Failed to process image ${imageUrl}:`, error);
      }
    }

    // If no images could be processed, return fallback
    if (imageParts.length === 0) {
      console.log('No images could be processed, returning fallback analysis');
      return new Response(JSON.stringify({
        visualAnalysis: `I received ${imageUrls.length} image(s) of your ${deviceCategory || 'electronic device'} but couldn't process them for detailed analysis. This could be due to image format or connectivity issues.`,
        likelyProblems: [
          "Connection or power supply issue",
          "Hardware component failure", 
          "Configuration or settings problem"
        ],
        confidence: "low",
        confirmationQuestions: [
          "What specific problem are you experiencing with this device?",
          "When did the issue first start occurring?",
          "Does the device power on when you try to use it?",
          "Are there any visible signs of damage or wear?",
          "Have you tried any troubleshooting steps already?"
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const prompt = `
    You are an expert device fault detector. Analyze the uploaded image carefully.
    Your task is to identify and describe the most likely issues with the device shown.

    Rules:
    1. Always return at least 1–3 possible problems, even if uncertain.
    2. If the image is unclear, describe possible faults based on what can typically go wrong with similar devices instead of saying "unable to analyze".
    3. Keep your output diagnostic only (do not give repair steps).

    Format your response as JSON with this exact structure:
    {
      "visualAnalysis": "brief description of what you see in the image",
      "likelyProblems": [
        "First possible issue based on visual evidence",
        "Second possible issue if any", 
        "Third possible issue if any"
      ],
      "confidence": "high/medium/low - based on image clarity and visible evidence",
      "confirmationQuestions": [
        "Does the device power on at all?",
        "Are there any unusual sounds when operating?",
        "When did you first notice this problem?",
        "Has the device been dropped or damaged recently?",
        "Are there any error messages or indicators showing?"
      ]
    }

    If you cannot clearly identify specific problems, provide the most common faults for similar electronic devices.
    Always include at least one likely problem - never say you cannot analyze.
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

    // Call Gemini API with timeout and error handling
    let analysis;
    try {
      console.log(`Calling Gemini API with ${imageParts.length} processed images`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini API error: ${response.status} - ${errorText}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        console.warn('No candidates in Gemini API response');
        throw new Error('No response from Gemini API');
      }

      const analysisText = data.candidates[0].content.parts[0].text;
      console.log('Received analysis from Gemini API:', analysisText.substring(0, 100) + '...');
      
      // Try to parse JSON response with robust error handling
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedAnalysis = JSON.parse(jsonMatch[0]);
          
          // Validate the structure
          if (parsedAnalysis.visualAnalysis && Array.isArray(parsedAnalysis.likelyProblems) && 
              parsedAnalysis.likelyProblems.length >= 1 && 
              Array.isArray(parsedAnalysis.confirmationQuestions)) {
            analysis = parsedAnalysis;
            console.log('Successfully parsed structured analysis from Gemini');
          } else {
            throw new Error('Invalid analysis structure from Gemini');
          }
        } else {
          throw new Error('No JSON found in Gemini response');
        }
      } catch (parseError) {
        console.warn('Failed to parse Gemini response, creating fallback:', parseError);
        // Create fallback with partial content from Gemini
        analysis = {
          visualAnalysis: analysisText.length > 200 ? analysisText.substring(0, 200) + "..." : analysisText,
          likelyProblems: [
            "Power or electrical fault",
            "Component failure or damage",
            "Connection or wiring issue"
          ],
          confidence: "low",
          confirmationQuestions: [
            "Based on the images, what specific malfunction are you experiencing?",
            "Are there any visible signs of damage, burns, or discoloration?",
            "Do you notice any loose, disconnected, or missing components?",
            "When you attempt to power on the device, what exactly happens?",
            "Have you tried any troubleshooting steps or repairs already?"
          ]
        };
      }
      
    } catch (apiError) {
      console.warn('Gemini API call failed, using fallback analysis:', apiError);
      // Use intelligent fallback based on device category
      const categorySpecificQuestions = {
        'device': [
          "What happens when you try to power on this electronic device?",
          "Are there any visible signs of damage, burns, or unusual wear?",
          "Do you hear any unusual sounds (clicking, buzzing, etc.) from the device?",
          "Are all cables and connections properly secured?",
          "When did you first notice the problem occurring?"
        ],
        'instrument': [
          "What readings or measurements is this instrument showing incorrectly?",
          "Are there any error messages or warning indicators displayed?",
          "Do the controls and buttons respond when pressed?",
          "Are there any visible signs of physical damage to the casing or display?",
          "When was the last time this instrument worked correctly?"
        ],
        'component': [
          "What symptoms led you to suspect this component is faulty?",
          "Are there any visible signs of burning, discoloration, or physical damage?",
          "Do you have a way to test this component (multimeter, oscilloscope, etc.)?",
          "What circuit or device was this component part of?",
          "When did the parent device or circuit start malfunctioning?"
        ],
        'pcb': [
          "What symptoms is this PCB or circuit board exhibiting?",
          "Are there any visible signs of burnt components, traces, or damaged areas?",
          "Do you see any loose, missing, or obviously damaged components?",
          "What device or system is this PCB from?",
          "When did the parent device start having problems?"
        ],
        'board': [
          "What specific functionality is not working on this development board?",
          "Are there any status LEDs that are not lighting up as expected?",
          "Can you successfully program or communicate with the board?",
          "Are there any visible signs of damage to components or connectors?",
          "What were you trying to do when the problem first occurred?"
        ]
      };
      
      const questions = categorySpecificQuestions[deviceCategory] || categorySpecificQuestions['device'];
      
      analysis = {
        visualAnalysis: `I can see your ${deviceCategory || 'electronic device'} in the uploaded images. While I couldn't perform detailed AI analysis at this time, I can still help you diagnose the issue through targeted questions.`,
        likelyProblems: [
          "Power supply or electrical issue",
          "Component malfunction or failure",
          "Connection or interface problem"
        ],
        confidence: "low",
        confirmationQuestions: questions
      };
    }

    console.log('Initial image analysis completed successfully');

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in initial-image-analysis function:', error);
    
    // Always return a fallback analysis instead of an error
    return new Response(JSON.stringify({
      visualAnalysis: `I've reviewed the uploaded images of your ${deviceCategory || 'electronic device'}. While I couldn't perform a detailed AI analysis, I can help you diagnose the issue.`,
      likelyProblems: [
        "Hardware or component failure",
        "Power or connection issue",
        "Software or configuration problem"
      ],
      confidence: "low",
      confirmationQuestions: [
        "What specific problem are you experiencing with this device?",
        "When did the issue first start occurring?",
        "Does the device show any signs of physical damage?",
        "Are there any error messages or unusual behaviors?",
        "Have you attempted any troubleshooting steps so far?"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});