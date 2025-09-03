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
    const { nameAnalysis, photoAnalysis, descriptionAnalysis, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const context = `
Device Category: ${nameAnalysis.deviceCategory}
Common Problems: ${nameAnalysis.commonProblems.join(', ')}
Photo Assessment: ${photoAnalysis.damageAssessment}
Visible Damage: ${photoAnalysis.visibleDamage.join(', ') || 'None detected'}
Prioritized Problems: ${descriptionAnalysis.prioritizedProblems.join(', ')}
Matched Keywords: ${descriptionAnalysis.matchedKeywords.join(', ')}
`;

    const prompt = `Generate dynamic, problem-specific clarifying questions based on the analysis so far.

${context}

Create 3-5 simple, easy-to-understand questions that will help narrow down the exact issue. Make the questions:
- Easy for a common person to answer (avoid technical jargon)
- Specific to the likely problems identified
- Practical and actionable
- Focused on symptoms, timing, and circumstances

Examples of good questions:
- Power issue → "Does the device turn on with a different cable?"
- Noise issue → "Does the sound happen all the time or only sometimes?"
- Screen problem → "Is the entire screen black or just parts of it?"
- Battery issue → "How long does the battery last compared to when it was new?"

Respond in ${getLanguageName(language)} with this exact JSON format:
{
  "questions": [
    {
      "id": "q1",
      "category": "Power",
      "question": "Simple question here?"
    },
    {
      "id": "q2", 
      "category": "Usage",
      "question": "Another simple question?"
    }
  ]
}

Categories can be: Power, Performance, Physical, Audio, Display, Connection, Usage, Environment`;

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
      throw new Error(data.error?.message || 'Failed to generate questions');
    }

    let result = {};
    try {
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      result = JSON.parse(resultText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      // Ensure required fields exist
      if (!result.questions || !Array.isArray(result.questions)) {
        result.questions = [
          {
            id: "q1",
            category: "General",
            question: "When did you first notice this problem?"
          },
          {
            id: "q2",
            category: "Usage",
            question: "Does the problem happen every time you use the device?"
          },
          {
            id: "q3",
            category: "Environment",
            question: "Has the device been dropped or exposed to water recently?"
          }
        ];
      }
      
    } catch (e) {
      console.error('Error parsing questions:', e);
      result = {
        questions: [
          {
            id: "q1",
            category: "General",
            question: "When did you first notice this problem?"
          },
          {
            id: "q2",
            category: "Usage",
            question: "Does the problem happen every time you use the device?"
          },
          {
            id: "q3",
            category: "Environment",
            question: "Has the device been dropped or exposed to water recently?"
          }
        ]
      };
    }

    return new Response(JSON.stringify(result), {
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