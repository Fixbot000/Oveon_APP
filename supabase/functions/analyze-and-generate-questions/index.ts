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
    const { deviceName, imageBase64, description, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const prompt = `Analyze the device name, image, and description to understand the problem and generate relevant questions.

Device: ${deviceName}
Description: ${description}

Based on this information:
1. Analyze the device name for common problems
2. Analyze the photo for visible damage, losses, or missing connections
3. Analyze the description for better understanding of the symptoms
4. Generate exactly 5 questions based on your analysis to help identify the problem clearly

The questions should:
- Be specific to the likely problems identified
- Help narrow down the exact issue
- Be easy for a common person to answer
- Focus on symptoms, timing, and circumstances
- Avoid technical jargon

Respond in ${getLanguageName(language)} with this exact JSON format:
{
  "analysis": {
    "nameAnalysis": {
      "commonProblems": ["problem1", "problem2"],
      "deviceCategory": "category"
    },
    "photoAnalysis": {
      "visibleDamage": ["damage1", "damage2"],
      "missingConnections": ["connection1", "connection2"],
      "condition": "overall condition description"
    },
    "descriptionAnalysis": {
      "symptoms": ["symptom1", "symptom2"],
      "severity": "low/medium/high"
    }
  },
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
    },
    {
      "id": "q3",
      "category": "Physical",
      "question": "Third question?"
    },
    {
      "id": "q4",
      "category": "Performance",
      "question": "Fourth question?"
    },
    {
      "id": "q5",
      "category": "Environment",
      "question": "Fifth question?"
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
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze device');
    }

    let result = {};
    try {
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      result = JSON.parse(resultText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      // Ensure required structure exists
      if (!result.analysis) {
        result.analysis = {
          nameAnalysis: {
            commonProblems: ["Device issue detected"],
            deviceCategory: "Unknown"
          },
          photoAnalysis: {
            visibleDamage: [],
            missingConnections: [],
            condition: "Unable to assess condition"
          },
          descriptionAnalysis: {
            symptoms: ["Issue reported"],
            severity: "medium"
          }
        };
      }
      
      if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
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
          },
          {
            id: "q4",
            category: "Power",
            question: "Does the device turn on and off normally?"
          },
          {
            id: "q5",
            category: "Performance",
            question: "How long have you had this device?"
          }
        ];
      }
      
    } catch (e) {
      console.error('Error parsing result:', e);
      result = {
        analysis: {
          nameAnalysis: {
            commonProblems: ["Device issue detected"],
            deviceCategory: "Unknown"
          },
          photoAnalysis: {
            visibleDamage: [],
            missingConnections: [],
            condition: "Unable to assess condition"
          },
          descriptionAnalysis: {
            symptoms: ["Issue reported"],
            severity: "medium"
          }
        },
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
          },
          {
            id: "q4",
            category: "Power",
            question: "Does the device turn on and off normally?"
          },
          {
            id: "q5",
            category: "Performance",
            question: "How long have you had this device?"
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