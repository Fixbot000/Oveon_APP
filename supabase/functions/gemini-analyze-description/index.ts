import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndScans } from "../helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization required',
        success: false
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    // Premium feature check
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase URL or service role key not found");
    }

    const { allowed, error: premiumError } = await checkPremiumAndScans(userId, supabaseServiceRoleKey, supabaseUrl);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: premiumError || 'Premium feature check failed.',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { description, previousAnalysis, questionAnswers, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const context = `
Previous image analysis: ${previousAnalysis}
Question answers: ${questionAnswers ? JSON.stringify(questionAnswers) : 'None provided'}
User description: ${description}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this additional context and description to refine the problem diagnosis and respond in ${getLanguageName(language)}:

${context}

IMPORTANT: Keep the analysis SHORT and ACTIONABLE. Follow these rules:
- Use bullet points for key findings
- Maximum 5 key points
- Each point under 15 words
- Focus on most likely causes
- If complex, provide brief summary
- Respond entirely in ${getLanguageName(language)}

Format:
## Updated Analysis:
• Finding 1: [description under 15 words in ${getLanguageName(language)}]
• Finding 2: [description under 15 words in ${getLanguageName(language)}]
• Finding 3: [description under 15 words in ${getLanguageName(language)}]

## Root Cause: [brief explanation under 20 words in ${getLanguageName(language)}]

Based on all this information, provide additional clarifying questions (if needed) to pinpoint the exact issue and solution.`
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze description');
    }

    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

    // Generate follow-up questions based on description analysis
    const questionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on this refined analysis: "${analysis}"

Generate 2-4 SIMPLE questions that anyone can understand and answer. Make the questions:
- Use everyday language, avoid technical terms
- Ask about what the user can see, hear, or feel
- Focus on simple observations (like "Does it make noise?", "What color is the screen?", "Is it hot?")
- Help identify the problem without requiring technical knowledge
- Written entirely in ${getLanguageName(language)}
- Keep each question under 10 words

Examples of GOOD questions:
- "Does the device turn on at all?"
- "Is there any sound when you press power?"
- "What does the screen look like?"
- "Does it feel hot or warm?"
- "When did this problem first happen?"

Format as a simple JSON array of strings in ${getLanguageName(language)}. If no additional questions are needed, return an empty array.`
          }]
        }]
      })
    });

    const questionData = await questionResponse.json();
    let questions = [];
    
    try {
      const questionText = questionData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      questions = JSON.parse(questionText.replace(/```json\n?/g, '').replace(/```/g, ''));
    } catch (e) {
      console.error('Error parsing questions:', e);
      questions = [];
    }

    return new Response(JSON.stringify({ 
      analysis,
      questions 
    }), {
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