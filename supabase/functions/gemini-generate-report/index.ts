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

    const { deviceName, problemDescription, questions, answers, language = 'en' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const qaText = questions.map((q: string, i: number) => 
      `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`
    ).join('\n\n');

    const context = `
Device Name: ${deviceName}
Problem Description: ${problemDescription}
Questions & Answers:
${qaText}
`;

    const prompt = `Based on all the provided information, generate a comprehensive repair diagnosis in ${getLanguageName(language)}. 
Return a JSON object with the following exact fields:
- problem: A clear description of the identified problem and its likely cause
- repairSteps: A step-by-step list of instructions to fix the issue (MUST be an array with detailed steps)
- toolsNeeded: A list of tools needed for the repair
- preventionTip: A tip on how to avoid this issue in the future

CRITICAL REQUIREMENTS:
- The 'repairSteps' field MUST contain detailed, actionable repair steps
- If the repair is dangerous, include "Stop using device and consult professional" as first step
- Make steps specific and clear for the device type: ${deviceName}
- Ensure all fields are populated with meaningful content
- Respond entirely in ${getLanguageName(language)}

${context}

Example JSON format:
{
  "problem": "Specific problem identified with ${deviceName} and the likely technical cause",
  "repairSteps": [
    "Turn off and unplug the ${deviceName} completely for safety",
    "Remove the outer casing using appropriate screwdriver",
    "Clean internal components with compressed air",
    "Check for loose connections and reseat them",
    "Reassemble and test functionality"
  ],
  "toolsNeeded": [
    "Screwdriver set",
    "Compressed air canister",
    "Anti-static brush"
  ],
  "preventionTip": "Clean your ${deviceName} every 6 months to prevent dust buildup"
}`;

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
      throw new Error(data.error?.message || 'Failed to generate report');
    }

    let report = {};
    try {
      const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      report = JSON.parse(reportText.replace(/```json\n?/g, '').replace(/```/g, ''));
      
      // Ensure repairSteps array exists and has at least one step
      if (!report.repairSteps || !Array.isArray(report.repairSteps) || report.repairSteps.length === 0) {
        report.repairSteps = ["Stop using the device and consult a professional technician for safe repair."];
      }
      
      // Ensure all required fields exist
      if (!report.problem) report.problem = "Device issue identified";
      if (!report.toolsNeeded) report.toolsNeeded = ["Professional consultation recommended"];
      if (!report.preventionTip) report.preventionTip = "Follow manufacturer maintenance guidelines";
      
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
    return new Response(JSON.stringify({ error: error.message, success: false }), {
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
