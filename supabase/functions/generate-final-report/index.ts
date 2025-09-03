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
    const { deviceName, nameAnalysis, photoAnalysis, descriptionAnalysis, questionAnswers, language = 'en' } = await req.json();
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
Question Answers: ${JSON.stringify(questionAnswers)}
`;

    const prompt = `Based on ALL the provided information, generate a comprehensive final solution report.

${context}

Analyze everything together: device name + photo + description + question answers to determine the most likely problem and solution.

Respond in ${getLanguageName(language)} with this exact JSON format:
{
  "likelyProblem": "Most probable issue based on all data",
  "reason": "Why this is happening (technical explanation made simple)",
  "repairSolution": [
    "Step 1: Clear actionable instruction with safety tips if applicable",
    "Step 2: Next step in sequence with safety tips if applicable", 
    "Step 3: Continue until complete, including safety tips"
  ],
  "toolsNeeded": [
    "Tool 1",
    "Tool 2",
    "Tool 3"
  ],
  "estimatedCost": "$20-$50 (or relevant currency)",
  "extraTip": "Tips and tricks to avoid this problem in the future",
  "alternativeProblems": [
    {
      "problem": "If not the main issue, this could be it",
      "reasoning": "Why this alternative makes sense"
    }
  ]
}

CRITICAL REQUIREMENTS:
- repairSolution MUST have at least 1 step, never be empty
- If repair is dangerous, start with "Stop using device and consult professional"
- Make steps specific and clear for ${deviceName}
- Ensure all fields are meaningful and populated
- Include safety warnings when needed
- If uncertain, include alternative problems with reasoning`;

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
      
      // Ensure repairSolution array exists and has at least one step
      if (!report.repairSolution || !Array.isArray(report.repairSolution) || report.repairSolution.length === 0) {
        report.repairSolution = ["Stop using the device and consult a professional technician for safe repair."];
      }
      
      // Ensure all required fields exist
      if (!report.likelyProblem) report.likelyProblem = "Device issue identified";
      if (!report.reason) report.reason = "Root cause analysis needed";
      if (!report.toolsNeeded) report.toolsNeeded = ["Professional consultation recommended"];
      if (!report.estimatedCost) report.estimatedCost = "Contact professional for quote";
      if (!report.extraTip) report.extraTip = "Follow manufacturer maintenance guidelines";
      
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