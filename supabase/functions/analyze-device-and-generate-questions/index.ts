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

    const prompt = `Analyze the device and generate 5 targeted questions to identify the problem clearly.

Device: ${deviceName}
Description: ${description}

Please analyze:
1. Device name for common problems
2. Photo for visible damage, losses, or missing connections  
3. Description for better understanding of symptoms

Based on this analysis, generate exactly 5 questions that:
- Are specific to likely problems identified
- Help narrow down the exact issue
- Are easy for common people to answer
- Focus on symptoms, timing, and circumstances
- Avoid technical jargon

Respond in ${getLanguageName(language)} with this JSON format:
{
  "questions": [
    {
      "id": "q1",
      "category": "Power",
      "question": "Simple question about power issues?"
    },
    {
      "id": "q2", 
      "category": "Usage",
      "question": "When does this problem occur?"
    },
    {
      "id": "q3",
      "category": "Physical",
      "question": "Any physical damage visible?"
    },
    {
      "id": "q4",
      "category": "Performance", 
      "question": "How does the device behave?"
    },
    {
      "id": "q5",
      "category": "Environment",
      "question": "Where/when did this start?"
    }
  ]
}

Categories: Power, Performance, Physical, Audio, Display, Connection, Usage, Environment`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
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
      
      if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
        result.questions = [
          { id: "q1", category: "General", question: "When did you first notice this problem?" },
          { id: "q2", category: "Usage", question: "Does this happen every time you use the device?" },
          { id: "q3", category: "Power", question: "Does the device turn on properly?" },
          { id: "q4", category: "Physical", question: "Has the device been dropped or damaged recently?" },
          { id: "q5", category: "Environment", question: "Where do you typically use this device?" }
        ];
      }
      
    } catch (e) {
      console.error('Error parsing result:', e);
      result = {
        questions: [
          { id: "q1", category: "General", question: "When did you first notice this problem?" },
          { id: "q2", category: "Usage", question: "Does this happen every time you use the device?" },
          { id: "q3", category: "Power", question: "Does the device turn on properly?" },
          { id: "q4", category: "Physical", question: "Has the device been dropped or damaged recently?" },
          { id: "q5", category: "Environment", question: "Where do you typically use this device?" }
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