import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, deviceName } = await req.json();
    
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase configuration not found");
    }

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check user profile and scan limits
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('isPremium, remainingScans, lastScanReset')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to retrieve user profile'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let { isPremium, remainingScans, lastScanReset } = userProfile;

    // Check and reset scan limits for free users
    if (!isPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastResetDate = lastScanReset ? new Date(lastScanReset) : null;

      if (!lastResetDate || lastResetDate.toDateString() !== today.toDateString()) {
        remainingScans = 3;
        lastScanReset = today.toISOString().split('T')[0];

        await supabase
          .from('profiles')
          .update({ remainingScans, lastScanReset })
          .eq('id', userId);
      }

      if (remainingScans <= 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Daily scan limit exceeded. Please upgrade to premium for unlimited scans.'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Call Gemini Vision API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analyze this image of a ${deviceName || 'device'} for any type of damage or issues. Check for:
- Physical damage (cracks, dents, broken parts, scratches)
- Dust, dirt, corrosion, or buildup
- Signs of overheating (burn marks, melted areas, discoloration)
- Loose or disconnected wires/connectors
- Missing components or screws
- Misalignment of parts
- Any other visible problems

IMPORTANT: Keep the analysis SHORT and ACTIONABLE. Follow these rules:
- Use bullet points for issues found
- Maximum 5 key issues
- Each issue under 15 words
- Focus on most critical problems first
- If no issues found, say "No visible issues detected"

Format:
## Issues Found:
• Issue 1: [description under 15 words]
• Issue 2: [description under 15 words]
• Issue 3: [description under 15 words]

## Likely Cause: [brief explanation]

## Recommended Action: [what to do next]`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64.split(',')[1]
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.error?.message || 'Failed to analyze image'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';

    // Save scan result to database (upsert - replace if same device exists)
    const { error: scanError } = await supabase
      .from('scans')
      .upsert({
        user_id: userId,
        device_name: deviceName || 'Unknown Device',
        result: result
      }, {
        onConflict: 'user_id,device_name'
      });

    if (scanError) {
      console.error('Error saving scan result:', scanError);
    }

    // Decrement scan count for free users
    if (!isPremium) {
      await supabase
        .from('profiles')
        .update({ remainingScans: remainingScans - 1 })
        .eq('id', userId);
    }

    return new Response(JSON.stringify({
      success: true,
      result: result,
      remainingScans: isPremium ? null : remainingScans - 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-device function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});