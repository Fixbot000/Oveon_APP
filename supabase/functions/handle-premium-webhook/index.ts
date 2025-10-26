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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase URL or service role key not found");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const payload = await req.json();

    // --- IMPORTANT: Implement your payment provider's webhook logic here ---
    // This is a placeholder. You will need to verify the webhook signature
    // and parse the specific event data from your payment provider (e.g., Stripe, Paddle).
    // The `userId` and `isPremiumStatus` should be extracted from the validated payload.

    let userId: string | null = null;
    let isPremiumStatus: boolean = false;

    // Example for a hypothetical payment provider
    // if (payload.type === 'subscription.updated' || payload.type === 'checkout.session.completed') {
    //   userId = payload.data.object.customer_id; // Or a metadata field containing your user ID
    //   isPremiumStatus = payload.data.object.status === 'active'; // Or check for specific plan
    // }

    // Placeholder logic for demonstration:
    // Assume the webhook payload directly provides userId and isPremium status
    userId = payload.userId;
    isPremiumStatus = payload.isPremium;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID not found in webhook payload.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ isPremium: isPremiumStatus })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user premium status:', error);
      throw error;
    }

    return new Response(JSON.stringify({ message: 'User premium status updated successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
