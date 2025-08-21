import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

// Get auth token from request
function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get and validate auth token
    const token = getAuthToken(req);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set auth header for Supabase client
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
      expires_in: 3600,
      expires_at: Date.now() / 1000 + 3600,
      token_type: 'bearer',
      user: null
    });

    const { sessionId, imageUrls, symptomsText, deviceCategory } = await req.json();

    // Input validation
    if (!sessionId || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Starting diagnostic analysis for session:', sessionId);

    // Step 1: Analyze images with Gemini Vision
    console.log('Step 1: Analyzing images with Gemini...');
    const visionResponse = await supabase.functions.invoke('gemini-vision', {
      body: { imageUrls, symptomsText, deviceCategory }
    });

    if (visionResponse.error) {
      throw new Error(`Vision analysis failed: ${visionResponse.error.message}`);
    }

    const aiAnalysis = visionResponse.data;
    console.log('Vision analysis completed:', aiAnalysis);

    // Update session with AI analysis
    await supabase
      .from('diagnostic_sessions')
      .update({ 
        ai_analysis: aiAnalysis,
        status: 'matching'
      })
      .eq('id', sessionId);

    // Step 2: Match with database records
    console.log('Step 2: Matching with database...');
    const matchResponse = await supabase.functions.invoke('database-matcher', {
      body: { aiAnalysis, deviceCategory }
    });

    if (matchResponse.error) {
      console.warn('Database matching failed:', matchResponse.error);
    }

    const databaseMatches = matchResponse.data || [];
    console.log('Database matches found:', databaseMatches.length);

    // Update session with database matches
    await supabase
      .from('diagnostic_sessions')
      .update({ 
        database_matches: databaseMatches,
        status: 'generating'
      })
      .eq('id', sessionId);

    // Step 3: Generate repair guidance with AI
    console.log('Step 3: Generating repair guidance...');
    const guidanceResponse = await supabase.functions.invoke('repair-guidance', {
      body: { 
        aiAnalysis, 
        databaseMatches, 
        symptomsText,
        deviceCategory 
      }
    });

    if (guidanceResponse.error) {
      throw new Error(`Repair guidance generation failed: ${guidanceResponse.error.message}`);
    }

    const repairGuidance = guidanceResponse.data;
    console.log('Repair guidance generated');

    // Step 4: If no good database matches, use backup search
    let backupResults = null;
    if (databaseMatches.length === 0 || (databaseMatches[0]?.confidence || 0) < 0.7) {
      console.log('Step 4: Using backup search...');
      const searchResponse = await supabase.functions.invoke('backup-search', {
        body: { 
          aiAnalysis, 
          symptomsText,
          deviceCategory 
        }
      });

      if (!searchResponse.error) {
        backupResults = searchResponse.data;
        console.log('Backup search completed');
      }
    }

    // Update session with final results
    await supabase
      .from('diagnostic_sessions')
      .update({ 
        repair_guidance: repairGuidance,
        backup_search_results: backupResults,
        status: 'completed'
      })
      .eq('id', sessionId);

    console.log('Diagnostic analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      aiAnalysis,
      databaseMatches,
      repairGuidance,
      backupResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-device function:', error);
    
    // Update session with error status if sessionId is available
    const body = await req.json().catch(() => ({}));
    if (body.sessionId) {
      await supabase
        .from('diagnostic_sessions')
        .update({ status: 'failed' })
        .eq('id', body.sessionId);
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});