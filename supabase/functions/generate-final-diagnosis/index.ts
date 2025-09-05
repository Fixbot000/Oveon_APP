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
    const { deviceName, analysis, questions, answers, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    // Format analysis context
    const analysisContext = `
Device: ${deviceName}
Device Category: ${analysis.nameAnalysis.deviceCategory}
Common Problems: ${analysis.nameAnalysis.commonProblems.join(', ')}
Photo Condition: ${analysis.photoAnalysis.condition}
Visible Damage: ${analysis.photoAnalysis.visibleDamage.join(', ') || 'None detected'}
Missing Connections: ${analysis.photoAnalysis.missingConnections.join(', ') || 'None detected'}
Symptoms: ${analysis.descriptionAnalysis.symptoms.join(', ')}
Severity: ${analysis.descriptionAnalysis.severity}
`;

    // Format question answers context
    const answersContext = questions.map(q => {
      const answer = answers[q.id] || 'Not answered';
      return `${q.category} - ${q.question}: ${answer}`;
    }).join('\n');

    const prompt = `Based on the comprehensive analysis and user answers, provide a final diagnosis and repair guide.

${analysisContext}

User Answers to Questions:
${answersContext}

Provide a complete diagnosis with problem identification, detailed repair steps, and safety tips.

Respond in ${getLanguageName(language)} with this exact JSON format:
{
  "problem": "Clear identification of the specific problem based on all available information",
  "detailedRepairSteps": [
    "Step 1: Detailed repair instruction that is easy to understand",
    "Step 2: Next specific repair step",
    "Step 3: Continue with clear, actionable instructions",
    "Step 4: More repair steps as needed"
  ],
  "safetyTips": [
    "Safety tip 1: Important safety consideration",
    "Safety tip 2: Another safety warning",
    "Safety tip 3: Additional safety precaution"
  ]
}

CRITICAL REQUIREMENTS:
- Problem must be specific and based on all analysis data and answers
- Repair steps must be detailed, clear, and easy to understand (not too long, not too short)
- Include at least 3-5 repair steps
- Include at least 3 safety tips
- Make instructions suitable for ${deviceName}
- All fields must be meaningful and populated`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to generate final diagnosis');
    }

    let diagnosis = {};
    try {
      const diagnosisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      diagnosis = JSON.parse(diagnosisText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      // Ensure required fields exist
      if (!diagnosis.problem) {
        diagnosis.problem = "Device issue requiring professional assessment";
      }
      
      if (!diagnosis.detailedRepairSteps || !Array.isArray(diagnosis.detailedRepairSteps) || diagnosis.detailedRepairSteps.length === 0) {
        diagnosis.detailedRepairSteps = [
          "Turn off the device completely and unplug it from power",
          "Inspect all visible connections and cables for damage",
          "Clean the device gently with appropriate cleaning materials",
          "Check for loose components or connections",
          "If problem persists, consult a professional technician"
        ];
      }
      
      if (!diagnosis.safetyTips || !Array.isArray(diagnosis.safetyTips) || diagnosis.safetyTips.length === 0) {
        diagnosis.safetyTips = [
          "Always turn off and unplug the device before attempting any repairs",
          "Avoid working on electrical devices in wet conditions",
          "If you're unsure about any step, consult a professional technician"
        ];
      }
      
    } catch (e) {
      console.error('Error parsing diagnosis:', e);
      diagnosis = {
        problem: "Device issue requiring professional assessment",
        detailedRepairSteps: [
          "Turn off the device completely and unplug it from power",
          "Inspect all visible connections and cables for damage", 
          "Clean the device gently with appropriate cleaning materials",
          "Check for loose components or connections",
          "If problem persists, consult a professional technician"
        ],
        safetyTips: [
          "Always turn off and unplug the device before attempting any repairs",
          "Avoid working on electrical devices in wet conditions",
          "If you're unsure about any step, consult a professional technician"
        ]
      };
    }

    return new Response(JSON.stringify(diagnosis), {
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

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)', 
    'de': 'German (Deutsch)',
    'it': 'Italian (Italiano)',
    'pt': 'Portuguese (Português)',
    'ru': 'Russian (Русский)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'zh': 'Chinese (中文)',
    'ar': 'Arabic (العربية)',
    'hi': 'Hindi (हiन्दी)'
  };
  return languages[code] || 'English';
}