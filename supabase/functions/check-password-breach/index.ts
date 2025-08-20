import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PasswordCheckRequest {
  password: string;
}

interface PasswordCheckResponse {
  isCompromised: boolean;
  breachCount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Password breach check request received');
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { password }: PasswordCheckRequest = await req.json();
    
    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create SHA-1 hash of the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    console.log('Generated password hash prefix');

    // Use k-anonymity: only send first 5 characters of hash
    const hashPrefix = hashHex.substring(0, 5);
    const hashSuffix = hashHex.substring(5);

    // Query HaveIBeenPwned API
    const hibpResponse = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
      headers: {
        'User-Agent': 'FixBot-Password-Checker'
      }
    });

    if (!hibpResponse.ok) {
      console.error('HaveIBeenPwned API error:', hibpResponse.status);
      return new Response(
        JSON.stringify({ error: 'Password check service temporarily unavailable' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const responseText = await hibpResponse.text();
    const lines = responseText.split('\n');
    
    console.log(`Received ${lines.length} hash suffixes from HaveIBeenPwned`);

    // Check if our hash suffix appears in the results
    let breachCount = 0;
    let isCompromised = false;

    for (const line of lines) {
      const [suffix, count] = line.split(':');
      if (suffix === hashSuffix) {
        breachCount = parseInt(count, 10);
        isCompromised = true;
        break;
      }
    }

    console.log(`Password check result: compromised=${isCompromised}, count=${breachCount}`);

    const result: PasswordCheckResponse = {
      isCompromised,
      breachCount
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in password breach check:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});