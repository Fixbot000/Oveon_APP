import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://byte-fixer.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Generating repair guidance with OpenAI...');

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
      body: JSON.stringify(requestBody)
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
    let guidance;
    try {
      const jsonMatch = guidanceText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guidance = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON response, creating fallback structure');
      guidance = {
        diagnosis: "Repair analysis completed",
        safetyWarnings: ["Always disconnect power before working on electronics"],
        skillLevel: "intermediate",
        estimatedTime: "1-2 hours",
        requiredTools: ["Basic electronics tools"],
        materials: ["Replacement components as needed"],
        repairSteps: [
          {
            step: 1,
            title: "Initial Assessment",
            description: "Carefully examine the device and follow safety procedures",
            warnings: ["Ensure power is disconnected"],
            tips: ["Take photos before disassembly"]
          }
        ],
        troubleshooting: [],
        preventiveMaintenance: ["Regular cleaning and inspection"],
        alternativeSolutions: ["Consult professional repair service"],
        costEstimate: {
          partsMin: 10,
          partsMax: 50,
          laborHours: 1,
          currency: "USD"
        },
        successRate: 0.7,
        riskLevel: "medium",
        whenToSeekProfessional: "If you're unsure about any step or safety procedures",
        rawGuidance: guidanceText
      };
    }

    console.log('Repair guidance generated successfully');

    return new Response(JSON.stringify(guidance), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in repair-guidance function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});