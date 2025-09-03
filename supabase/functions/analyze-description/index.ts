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
    const { description, nameAnalysis, photoAnalysis, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const context = `
Device Category: ${nameAnalysis.deviceCategory}
Common Problems: ${nameAnalysis.commonProblems.join(', ')}
Photo Assessment: ${photoAnalysis.damageAssessment}
Visible Damage: ${photoAnalysis.visibleDamage.join(', ') || 'None detected'}
User Description: ${description}
`;

    const prompt = `Analyze the user's description and match it with previous analysis data.

${context}

Your task:
1. Match keywords from the user description with the device's common problems
2. Cross-check with visible damage from photo analysis
3. Prioritize the most likely problems based on all information

Respond in ${getLanguageName(language)} with this exact JSON format:
{
  "prioritizedProblems": ["most_likely_problem", "second_likely", "third_likely"],
  "matchedKeywords": ["keyword1", "keyword2", "keyword3"]
}

The prioritizedProblems should be ranked by likelihood based on:
- How well the description matches known problems
- Visible damage correlation
- Common failure patterns for this device type

The matchedKeywords should be key terms from the description that relate to potential issues.`;

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
      throw new Error(data.error?.message || 'Failed to analyze description');
    }

    let analysis = {};
    try {
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      analysis = JSON.parse(analysisText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      // Ensure required fields exist
      if (!analysis.prioritizedProblems || !Array.isArray(analysis.prioritizedProblems)) {
        analysis.prioritizedProblems = ["Diagnostic needed", "Component check required", "Further analysis needed"];
      }
      if (!analysis.matchedKeywords || !Array.isArray(analysis.matchedKeywords)) {
        analysis.matchedKeywords = ["general", "issue", "problem"];
      }
      
    } catch (e) {
      console.error('Error parsing analysis:', e);
      analysis = {
        prioritizedProblems: ["Diagnostic needed", "Component check required", "Further analysis needed"],
        matchedKeywords: ["general", "issue", "problem"]
      };
    }

    return new Response(JSON.stringify(analysis), {
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