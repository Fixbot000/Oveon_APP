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
    const { deviceName, description, questions, answers, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const answersText = questions.map(q => {
      const answer = answers[q.id] || 'Not answered';
      return `${q.category} - ${q.question}: ${answer}`;
    }).join('\n');

    const prompt = `Based on all the information provided, give a final diagnosis with problem identification, detailed repair steps, and safety tips.

Device: ${deviceName}
User Description: ${description}

Questions and Answers:
${answersText}

Analyze all this information (device name, description, and answers) to provide:
1. Problem identification
2. Detailed repair steps (not too long, not too short, easy to understand)
3. Safety tips

Respond in ${getLanguageName(language)} with this JSON format:
{
  "problem": "Clear identification of the specific problem",
  "detailedRepairSteps": [
    "Step 1: Clear, easy-to-understand repair instruction",
    "Step 2: Next specific repair step", 
    "Step 3: Continue with actionable instructions",
    "Step 4: More steps as needed"
  ],
  "safetyTips": [
    "Safety tip 1: Important safety consideration",
    "Safety tip 2: Another safety warning",
    "Safety tip 3: Additional safety precaution"
  ]
}

Requirements:
- Problem must be specific based on all information
- Repair steps must be detailed, clear, and practical
- Include 3-6 repair steps
- Include 3+ safety tips
- Make instructions suitable for ${deviceName}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to generate diagnosis');
    }

    let diagnosis = {};
    try {
      const diagnosisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      diagnosis = JSON.parse(diagnosisText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      if (!diagnosis.problem) {
        diagnosis.problem = "Device requires professional assessment";
      }
      
      if (!diagnosis.detailedRepairSteps || !Array.isArray(diagnosis.detailedRepairSteps) || diagnosis.detailedRepairSteps.length === 0) {
        diagnosis.detailedRepairSteps = [
          "Turn off the device completely and unplug from power",
          "Check all visible connections and cables",
          "Clean the device gently with appropriate materials",
          "Test the device after cleaning",
          "If problem persists, consult a professional technician"
        ];
      }
      
      if (!diagnosis.safetyTips || !Array.isArray(diagnosis.safetyTips) || diagnosis.safetyTips.length === 0) {
        diagnosis.safetyTips = [
          "Always turn off and unplug device before repairs",
          "Avoid working on electrical devices in wet conditions",
          "If unsure about any step, consult a professional"
        ];
      }
      
    } catch (e) {
      console.error('Error parsing diagnosis:', e);
      diagnosis = {
        problem: "Device requires professional assessment",
        detailedRepairSteps: [
          "Turn off the device completely and unplug from power",
          "Check all visible connections and cables",
          "Clean the device gently with appropriate materials", 
          "Test the device after cleaning",
          "If problem persists, consult a professional technician"
        ],
        safetyTips: [
          "Always turn off and unplug device before repairs",
          "Avoid working on electrical devices in wet conditions",
          "If unsure about any step, consult a professional"
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
    'hi': 'Hindi (हिन्दी)'
  };
  return languages[code] || 'English';
}