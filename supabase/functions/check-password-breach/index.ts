import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createHash } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordCheckRequest {
  password: string;
}

interface PasswordCheckResponse {
  isBreached: boolean;
  breachCount?: number;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  try {
    const { password }: PasswordCheckRequest = await req.json();

    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ 
          isBreached: false, 
          error: 'Password must be at least 6 characters long' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Create SHA1 hash of the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Use k-anonymity: send only first 5 characters of hash
    const hashPrefix = hashHex.substring(0, 5);
    const hashSuffix = hashHex.substring(5);

    console.log(`Checking password breach for hash prefix: ${hashPrefix}`);

    // Query HaveIBeenPwned API with k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Lovable-App-Password-Check',
        'Add-Padding': 'true' // Adds padding to prevent statistical analysis
      }
    });

    if (!response.ok) {
      console.error(`HaveIBeenPwned API error: ${response.status}`);
      // If API is down, allow the password (fail open for user experience)
      return new Response(
        JSON.stringify({ isBreached: false, error: null }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const responseText = await response.text();
    const lines = responseText.split('\n');

    // Check if our hash suffix appears in the results
    let breachCount = 0;
    let isBreached = false;

    for (const line of lines) {
      const [suffix, count] = line.trim().split(':');
      if (suffix === hashSuffix) {
        breachCount = parseInt(count, 10);
        isBreached = true;
        break;
      }
    }

    console.log(`Password breach check result: isBreached=${isBreached}, count=${breachCount}`);

    const result: PasswordCheckResponse = {
      isBreached,
      breachCount: isBreached ? breachCount : undefined
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in password breach check:', error);
    
    // If there's an error, fail open (allow password) for better user experience
    return new Response(
      JSON.stringify({ 
        isBreached: false, 
        error: 'Unable to check password security at this time' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);