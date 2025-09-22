import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndScans } from '../helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deviceName, photo } = await req.json();
    
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

    // Step 1: Temporarily store the photo in Supabase
    let tempFilePath = '';
    let imageBase64 = '';
    
    try {
      // Convert photo to base64 if needed
      if (photo.startsWith('data:')) {
        imageBase64 = photo;
      } else {
        imageBase64 = `data:image/jpeg;base64,${photo}`;
      }

      // Create temporary file path
      tempFilePath = `temp/${userId}/${Date.now()}_scan.jpg`;
      
      // Convert base64 to blob for storage
      const base64Data = imageBase64.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      // Upload to temporary storage
      const { error: uploadError } = await supabase.storage
        .from('device-images')
        .upload(tempFilePath, bytes, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Failed to upload photo:', uploadError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to temporarily store photo'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } catch (uploadError) {
      console.error('Photo upload error:', uploadError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to process photo upload'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Retrieve the stored photo for analysis (we already have it as imageBase64)
    
    try {
      // Step 3: Continue the normal Scan process without changing any logic
      
      // Check user profile and scan limits using the helper function
      const { allowed, error: scanCheckError } = await checkPremiumAndScans(userId, supabaseServiceRoleKey, supabaseUrl);

      if (!allowed) {
        // Clean up temp file before returning error
        await supabase.storage.from('device-images').remove([tempFilePath]);
        
        return new Response(JSON.stringify({
          success: false,
          error: scanCheckError || 'Scan limit exceeded or other error.'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch user profile again to get updated remainingScans after checkPremiumAndScans has run
      const { data: userProfileAfterCheck, error: profileErrorAfterCheck } = await supabase
        .from('profiles')
        .select('ispremium, remainingscans')
        .eq('id', userId)
        .single();

      if (profileErrorAfterCheck || !userProfileAfterCheck) {
        // Clean up temp file before returning error
        await supabase.storage.from('device-images').remove([tempFilePath]);
        
        console.error('Error fetching user profile after scan check:', profileErrorAfterCheck);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to retrieve user profile after scan check.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { ispremium, remainingscans } = userProfileAfterCheck;

      // Call Gemini Vision API with the exact same logic as scan-device
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
        // Clean up temp file before returning error
        await supabase.storage.from('device-images').remove([tempFilePath]);
        
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

      // Step 4: Return results in the same structured format
      const scanResults = {
        success: true,
        analysis: result,
        deviceName: deviceName || 'Unknown Device',
        remainingScans: ispremium ? null : remainingscans
      };

      // Step 5: Delete the photo from Supabase immediately after results are generated
      try {
        const { error: deleteError } = await supabase.storage
          .from('device-images')
          .remove([tempFilePath]);
          
        if (deleteError) {
          console.error('Warning: Failed to delete temporary file:', deleteError);
        }
      } catch (deleteError) {
        console.error('Warning: Error during file cleanup:', deleteError);
      }

      return new Response(JSON.stringify(scanResults), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // Ensure cleanup on any error during processing
      try {
        await supabase.storage.from('device-images').remove([tempFilePath]);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      throw error;
    }

  } catch (error) {
    console.error('Error in scan-assistant function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});