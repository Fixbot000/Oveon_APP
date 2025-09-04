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
    const { deviceName, nameAnalysis, photoAnalysis, descriptionAnalysis, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const context = `
Device: ${deviceName}
Device Category: ${nameAnalysis.deviceCategory}
Common Problems: ${nameAnalysis.commonProblems.join(', ')}
Photo Assessment: ${photoAnalysis.damageAssessment}
Visible Damage: ${photoAnalysis.visibleDamage.join(', ') || 'None detected'}
Prioritized Problems: ${descriptionAnalysis.prioritizedProblems.join(', ')}
Matched Keywords: ${descriptionAnalysis.matchedKeywords.join(', ')}
`;

    const prompt = `Analyze the device name, image, and description to provide a comprehensive repair solution.

${context}

Based on device name + image + description analysis, provide exactly 3 sections:

Respond in ${getLanguageName(language)} with this exact JSON format:
{
  "problemWithReason": {
    "problem": "Most probable issue identified",
    "reason": "Technical explanation of why this problem occurs"
  },
  "repairStepsWithSafety": [
    "Step 1: Clear repair instruction with safety tips included",
    "Step 2: Next repair step with safety considerations",
    "Step 3: Continue with detailed safety-conscious instructions"
  ],
  "toolsNeeded": [
    "Tool 1 required for repair",
    "Tool 2 needed",
    "Tool 3 necessary"
  ]
}

CRITICAL REQUIREMENTS:
- repairStepsWithSafety MUST have at least 1 step, never empty
- Include safety warnings in repair steps when needed
- If repair is dangerous, start with "Stop using device and consult professional"
- Make steps specific for ${deviceName}
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
      throw new Error(data.error?.message || 'Failed to generate final report');
    }

    let report = {};
    try {
      const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      report = JSON.parse(reportText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      // Ensure repairStepsWithSafety array exists and has at least one step
      if (!report.repairStepsWithSafety || !Array.isArray(report.repairStepsWithSafety) || report.repairStepsWithSafety.length === 0) {
        report.repairStepsWithSafety = ["Stop using the device and consult a professional technician for safe repair."];
      }
      
      // Ensure required fields exist
      if (!report.problemWithReason) {
        report.problemWithReason = {
          problem: "Device issue identified",
          reason: "Root cause analysis needed"
        };
      }
      if (!report.toolsNeeded) report.toolsNeeded = ["Professional consultation recommended"];
      
    } catch (e) {
      console.error('Error parsing report:', e);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse report from AI. Please try again.',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(report), {
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