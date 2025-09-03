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
    const { deviceName, nameAnalysis, photoAnalysis, descriptionAnalysis, questionAnswers, currentSolution, language = 'en' } = await req.json();
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

Previous Solution Tried:
Problem: ${currentSolution.likelyProblem}
Solution: ${currentSolution.repairSolution.join(' → ')}
`;

    const prompt = `The user tried the previous solution but it didn't work. Generate alternative causes and solutions.

${context}

Since the main solution didn't work, consider:
1. Other possible causes for the same symptoms
2. More complex underlying issues
3. Less common but possible problems
4. Professional diagnostic recommendations

Respond in ${getLanguageName(language)} with detailed alternative solutions. Format as plain text with clear sections for different possibilities.

Structure your response like:
**Alternative Cause 1: [Problem Name]**
- Why this might be the issue: [explanation]
- What to try: [step-by-step solution]
- Tools needed: [list]
- Estimated cost: [range]

**Alternative Cause 2: [Problem Name]**
[same format]

**When to Seek Professional Help:**
[guidance on when DIY isn't enough]

Make it comprehensive but easy to understand for a common person.`;

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
      throw new Error(data.error?.message || 'Failed to generate alternatives');
    }

    const alternatives = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No alternative solutions could be generated at this time. Please consult a professional technician for further diagnosis.';

    return new Response(JSON.stringify({ alternatives }), {
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