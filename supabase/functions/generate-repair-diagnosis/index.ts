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

    const prompt = `Based on all the information provided, analyze everything comprehensively and provide a complete diagnosis and repair guide.

Device: ${deviceName}
User Description: ${description}

Questions and Answers:
${answersText}

Analyze ALL this information (device name for common problems, image for visible damage/issues, description for more problem details, and question answers for clarification) to provide:

1. Problem identification with reason
2. Detailed repair steps with safety tips integrated
3. Tools needed for the repair
4. Prevention tip to avoid this problem in future

Respond in ${getLanguageName(language)} with this JSON format:
{
  "problem": "Clear identification of the specific problem with explanation of why this is the issue based on the provided information",
  "repairSteps": [
    "Step 1: Clear, detailed repair instruction with safety considerations",
    "Step 2: Next specific repair step with any safety warnings", 
    "Step 3: Continue with actionable instructions including safety measures",
    "Step 4: More steps as needed with integrated safety tips"
  ],
  "toolsNeeded": [
    "Tool 1: Specific tool needed for repair",
    "Tool 2: Another required tool",
    "Tool 3: Additional tools if needed"
  ],
  "preventionTip": "Practical advice on how to prevent this problem from happening again in the future"
}

Requirements:
- Problem must be specific and include reasoning based on device name, image analysis, description, and answers
- Repair steps must be detailed but not too long, easy to understand, with safety tips integrated naturally
- Include 4-8 repair steps with safety considerations
- List all necessary tools for the repair
- Provide one practical prevention tip
- Make all instructions suitable for ${deviceName}`;

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
        diagnosis.problem = "Device requires professional assessment due to insufficient information provided";
      }
      
      if (!diagnosis.repairSteps || !Array.isArray(diagnosis.repairSteps) || diagnosis.repairSteps.length === 0) {
        diagnosis.repairSteps = [
          "Turn off the device completely and unplug from power for safety",
          "Check all visible connections and cables for loose connections",
          "Clean the device gently with appropriate materials (avoid moisture)",
          "Test the device after cleaning in a safe environment",
          "If problem persists, consult a professional technician"
        ];
      }
      
      if (!diagnosis.toolsNeeded || !Array.isArray(diagnosis.toolsNeeded) || diagnosis.toolsNeeded.length === 0) {
        diagnosis.toolsNeeded = [
          "Basic screwdriver set",
          "Cleaning cloth",
          "Multimeter (if electrical testing needed)"
        ];
      }
      
      if (!diagnosis.preventionTip) {
        diagnosis.preventionTip = "Regular maintenance and avoiding exposure to extreme conditions can prevent many device issues";
      }
      
    } catch (e) {
      console.error('Error parsing diagnosis:', e);
      diagnosis = {
        problem: "Device requires professional assessment due to insufficient information provided",
        repairSteps: [
          "Turn off the device completely and unplug from power for safety",
          "Check all visible connections and cables for loose connections",
          "Clean the device gently with appropriate materials (avoid moisture)", 
          "Test the device after cleaning in a safe environment",
          "If problem persists, consult a professional technician"
        ],
        toolsNeeded: [
          "Basic screwdriver set",
          "Cleaning cloth",
          "Multimeter (if electrical testing needed)"
        ],
        preventionTip: "Regular maintenance and avoiding exposure to extreme conditions can prevent many device issues"
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