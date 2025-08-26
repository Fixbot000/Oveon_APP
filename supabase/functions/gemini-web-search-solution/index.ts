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
    const { finalAnalysis, allAnswers, deviceType, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const searchQuery = `How to repair ${deviceType || 'device'} ${finalAnalysis.slice(0, 200)} step by step guide`;

    // Use Gemini directly to generate repair solutions
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Based on the detailed analysis and user information, provide a COMPREHENSIVE repair solution for this electronic device problem in ${getLanguageName(language)}:

**Problem Analysis:** ${finalAnalysis}

**User Responses:** ${JSON.stringify(allAnswers, null, 2)}

**Device Type:** ${deviceType || 'Electronic Device'}

Provide a detailed solution that includes problem identification, root cause, and step-by-step repair instructions. Respond entirely in ${getLanguageName(language)}.

Format:
## Problem Identified:
[Clear description of what's wrong with the device - 2-3 sentences in ${getLanguageName(language)}]

## Root Cause Analysis:
[Explain WHY this problem occurred - mechanical failure, wear, misuse, etc. - 2-3 sentences in ${getLanguageName(language)}]

## Repair Solution:
1. [Detailed step with specific actions and tools needed in ${getLanguageName(language)}]
2. [Detailed step with specific actions and tools needed in ${getLanguageName(language)}]
3. [Detailed step with specific actions and tools needed in ${getLanguageName(language)}]
4. [Detailed step with specific actions and tools needed in ${getLanguageName(language)}]
5. [Detailed step with specific actions and tools needed in ${getLanguageName(language)}]

## Why This Solution Works:
[Explain the technical reasoning behind the repair approach - how each step addresses the root cause - 2-3 sentences in ${getLanguageName(language)}]

## Required Tools & Parts:
• [Specific tool 1 in ${getLanguageName(language)}]
• [Specific tool 2 in ${getLanguageName(language)}]
• [Replacement part if needed in ${getLanguageName(language)}]
• [Any consumables like thermal paste, cleaning solution in ${getLanguageName(language)}]

## Safety Warnings:
⚠️ [Critical safety precautions specific to this repair in ${getLanguageName(language)}]

## Success Indicators:
[How to know the repair worked - what to test/observe in ${getLanguageName(language)}]`
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to search for solution');
    }

    const solution = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No solution found';

    return new Response(JSON.stringify({ 
      solution,
      searchQuery
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