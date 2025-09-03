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
    const { imageBase64, deviceName, commonProblems, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const prompt = `Analyze this photo of a ${deviceName} for visible signs of damage or issues.

Known common problems for this device type: ${commonProblems.join(', ')}

Look for:
- Physical damage (cracks, dents, burns, corrosion)
- Loose or disconnected parts
- Unusual wear patterns
- Liquid damage signs
- Component damage
- Visible defects

Respond in ${getLanguageName(language)} with this exact JSON format:
{
  "damageAssessment": "[overall assessment - either 'No visible damage detected', 'Minor damage visible', or 'Significant damage detected']",
  "visibleDamage": ["damage1", "damage2", "damage3"]
}

The visibleDamage array should only include actual visible issues you can see in the photo. If no damage is visible, use an empty array.`;

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
      throw new Error(data.error?.message || 'Failed to analyze device photo');
    }

    let analysis = {};
    try {
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      analysis = JSON.parse(analysisText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      // Ensure required fields exist
      if (!analysis.damageAssessment) analysis.damageAssessment = "Assessment pending";
      if (!analysis.visibleDamage || !Array.isArray(analysis.visibleDamage)) {
        analysis.visibleDamage = [];
      }
      
    } catch (e) {
      console.error('Error parsing analysis:', e);
      analysis = {
        damageAssessment: "Assessment pending",
        visibleDamage: []
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