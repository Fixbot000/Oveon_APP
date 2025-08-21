import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { aiAnalysis, databaseMatches, symptomsText, deviceCategory } = await req.json();

    // Input validation
    if (!aiAnalysis || !deviceCategory) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if we have required API keys
    if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
      throw new Error('Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured');
    }

    console.log('Generating repair guidance...');

    // Build context from database matches
    let databaseContext = '';
    if (databaseMatches && databaseMatches.length > 0) {
      databaseContext = '\n\nDatabase matches found:\n';
      databaseMatches.forEach((match: any, index: number) => {
        databaseContext += `\nMatch ${index + 1} (confidence: ${match.confidence}):\n`;
        databaseContext += JSON.stringify(match.record, null, 2);
      });
    }

    const systemPrompt = `You are an expert electronics repair technician with decades of experience. 
    You provide clear, safe, and practical repair guidance for electronic devices, instruments, components, PCBs, and boards.
    
    Always prioritize safety and warn about electrical hazards. Provide step-by-step instructions that are easy to follow.
    Include information about required tools, safety equipment, and skill level required.`;

    const userPrompt = `
    Please provide comprehensive repair guidance for this electronic ${deviceCategory || 'device'}.

    AI Vision Analysis:
    ${JSON.stringify(aiAnalysis, null, 2)}

    ${symptomsText ? `User reported symptoms: ${symptomsText}` : ''}

    ${databaseContext}

    Please provide your response in the following JSON format:
    {
      "diagnosis": "Clear explanation of what's wrong",
      "safetyWarnings": ["Critical safety warnings"],
      "skillLevel": "beginner|intermediate|advanced|professional",
      "estimatedTime": "Time needed for repair",
      "requiredTools": ["List of tools needed"],
      "materials": ["Components or materials needed"],
      "repairSteps": [
        {
          "step": 1,
          "title": "Step title",
          "description": "Detailed step description",
          "warnings": ["Any warnings for this step"],
          "tips": ["Helpful tips"]
        }
      ],
      "troubleshooting": [
        {
          "issue": "Potential issue",
          "solution": "How to resolve it"
        }
      ],
      "preventiveMaintenance": ["Tips to prevent future issues"],
      "alternativeSolutions": ["Other approaches if main repair fails"],
      "costEstimate": {
        "partsMin": 0,
        "partsMax": 0,
        "laborHours": 0,
        "currency": "USD"
      },
      "successRate": 0.85,
      "riskLevel": "low|medium|high",
      "whenToSeekProfessional": "When to get professional help"
    }
    `;

    let guidance;
    
    // Try ChatGPT first if available
    if (OPENAI_API_KEY) {
      try {
        console.log('Attempting repair guidance with ChatGPT...');
        
        const requestBody = {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 3000,
          temperature: 0.1
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
          throw new Error('No response from OpenAI API');
        }

        const guidanceText = data.choices[0].message.content;
        
        // Try to parse JSON response
        try {
          const jsonMatch = guidanceText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            guidance = JSON.parse(jsonMatch[0]);
            console.log('Successfully generated guidance with ChatGPT');
          } else {
            throw new Error('No JSON found in ChatGPT response');
          }
        } catch (parseError) {
          throw new Error('Failed to parse ChatGPT JSON response');
        }

      } catch (chatgptError) {
        console.warn('ChatGPT failed, falling back to Gemini:', chatgptError);
        guidance = null; // Will trigger Gemini fallback
      }
    }

    // Fallback to Gemini if ChatGPT failed or unavailable
    if (!guidance && GEMINI_API_KEY) {
      try {
        console.log('Using Gemini AI for repair guidance...');
        
        const geminiRequestBody = {
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 3000,
          }
        };

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiRequestBody),
            signal: AbortSignal.timeout(30000) // 30 second timeout
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        
        if (!geminiData.candidates || geminiData.candidates.length === 0) {
          throw new Error('No response from Gemini API');
        }

        const geminiText = geminiData.candidates[0].content.parts[0].text;
        
        // Try to parse Gemini JSON response
        try {
          const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            guidance = JSON.parse(jsonMatch[0]);
            console.log('Successfully generated guidance with Gemini AI');
          } else {
            throw new Error('No JSON found in Gemini response');
          }
        } catch (parseError) {
          console.warn('Failed to parse Gemini JSON, creating fallback structure');
          // Create structured fallback from Gemini text
          guidance = {
            diagnosis: geminiText.substring(0, 200) + "...",
            safetyWarnings: ["Always disconnect power before working on electronics", "Use proper safety equipment"],
            skillLevel: "intermediate",
            estimatedTime: "1-3 hours",
            requiredTools: ["Basic electronics tools", "Multimeter", "Screwdrivers"],
            materials: ["Replacement components as needed"],
            repairSteps: [
              {
                step: 1,
                title: "Safety Preparation",
                description: "Disconnect power and prepare workspace",
                warnings: ["Ensure complete power disconnection"],
                tips: ["Use anti-static precautions"]
              },
              {
                step: 2,
                title: "Diagnosis",
                description: "Examine the device following the analysis provided",
                warnings: ["Check for signs of electrical damage"],
                tips: ["Take detailed photos before disassembly"]
              }
            ],
            troubleshooting: [
              {
                issue: "Repair doesn't work as expected",
                solution: "Double-check connections and component orientation"
              }
            ],
            preventiveMaintenance: ["Regular cleaning", "Proper storage", "Periodic inspection"],
            alternativeSolutions: ["Professional repair service", "Component replacement"],
            costEstimate: {
              partsMin: 10,
              partsMax: 100,
              laborHours: 2,
              currency: "USD"
            },
            successRate: 0.7,
            riskLevel: "medium",
            whenToSeekProfessional: "If you encounter unexpected issues or lack proper tools",
            source: "gemini_fallback"
          };
        }

      } catch (geminiError) {
        console.error('Gemini AI also failed:', geminiError);
        guidance = null; // Will trigger final fallback
      }
    }

    // Final fallback if both AI services failed
    if (!guidance) {
      console.log('Both AI services failed, using static fallback');
      guidance = {
        diagnosis: `Based on the provided analysis, this ${deviceCategory} appears to require professional diagnosis and repair.`,
        safetyWarnings: [
          "Always disconnect power before working on electronics",
          "Use proper safety equipment including safety glasses and anti-static precautions",
          "Never work on live circuits"
        ],
        skillLevel: "professional",
        estimatedTime: "Varies depending on issue complexity",
        requiredTools: ["Professional electronics repair tools", "Multimeter", "Oscilloscope (if needed)"],
        materials: ["Diagnostic equipment", "Replacement components as identified"],
        repairSteps: [
          {
            step: 1,
            title: "Safety Assessment",
            description: "Ensure complete power disconnection and prepare a safe workspace",
            warnings: ["Verify no residual power in capacitors"],
            tips: ["Use an anti-static wrist strap"]
          },
          {
            step: 2,
            title: "Professional Diagnosis",
            description: "This device requires professional diagnostic equipment and expertise",
            warnings: ["Improper repair attempts may cause further damage"],
            tips: ["Document all symptoms before seeking professional help"]
          }
        ],
        troubleshooting: [
          {
            issue: "Unable to identify specific problem",
            solution: "Seek professional diagnostic services"
          }
        ],
        preventiveMaintenance: [
          "Regular professional maintenance",
          "Proper environmental conditions",
          "Avoid overloading or misuse"
        ],
        alternativeSolutions: [
          "Professional repair service",
          "Manufacturer warranty service",
          "Authorized service center"
        ],
        costEstimate: {
          partsMin: 50,
          partsMax: 300,
          laborHours: 2,
          currency: "USD"
        },
        successRate: 0.9,
        riskLevel: "low",
        whenToSeekProfessional: "This device requires professional attention for safe and effective repair",
        source: "static_fallback"
      };
    }

    console.log('Repair guidance generated successfully');

    return new Response(JSON.stringify(guidance), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in repair-guidance function:', error);
    
    // Even on error, provide a basic fallback response
    const errorFallback = {
      diagnosis: "Unable to generate detailed repair guidance due to service issues",
      safetyWarnings: ["Always disconnect power before working on electronics"],
      skillLevel: "professional",
      estimatedTime: "Unknown",
      requiredTools: ["Professional repair tools"],
      materials: ["Professional diagnosis required"],
      repairSteps: [
        {
          step: 1,
          title: "Seek Professional Help",
          description: "Due to service limitations, professional assistance is recommended",
          warnings: ["Do not attempt repair without proper guidance"],
          tips: ["Contact a qualified repair technician"]
        }
      ],
      troubleshooting: [],
      preventiveMaintenance: ["Professional maintenance"],
      alternativeSolutions: ["Professional repair service"],
      costEstimate: {
        partsMin: 0,
        partsMax: 0,
        laborHours: 0,
        currency: "USD"
      },
      successRate: 0.5,
      riskLevel: "high",
      whenToSeekProfessional: "Immediately - professional help is required",
      error: error.message,
      source: "error_fallback"
    };

    return new Response(JSON.stringify(errorFallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});