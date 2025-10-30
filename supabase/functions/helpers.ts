import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

interface UserProfile {
  ispremium: boolean;
  remainingscans: number;
  lastscanreset: string | null;
}

export async function checkPremiumAndScans(userId: string, supabaseServiceRoleKey: string, supabaseUrl: string): Promise<{ allowed: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('ispremium, remainingscans, lastscanreset')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile for scan check:', profileError);
    return { allowed: false, error: 'Failed to retrieve user profile for scan check.' };
  }

  let { ispremium, remainingscans, lastscanreset } = userProfile;

  if (ispremium) {
    return { allowed: true }; // Premium users have unlimited scans
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastResetDate = lastscanreset ? new Date(lastscanreset) : null;

  if (!lastResetDate || lastResetDate.toDateString() < today.toDateString()) {
    remainingscans = 2; // Reset scans daily to 2 for free users
    lastscanreset = today.toISOString().split('T')[0]; // Store as YYYY-MM-DD

    await supabase
      .from('profiles')
      .update({ remainingscans, lastscanreset })
      .eq('id', userId);
  }

  if (remainingscans <= 0) {
    return { allowed: false, error: 'Scan limit exceeded. Please upgrade to premium for unlimited scans.' };
  }

  // Decrement scan count for free users
  remainingscans--;
  await supabase
    .from('profiles')
    .update({ remainingscans })
    .eq('id', userId);

  return { allowed: true };
}

export async function checkPremiumAndIdentify(userId: string, supabaseServiceRoleKey: string, supabaseUrl: string): Promise<{ allowed: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('ispremium, remainingidentify, lastidentifyreset')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile for identify check:', profileError);
    return { allowed: false, error: 'Failed to retrieve user profile for identify check.' };
  }

  let { ispremium, remainingidentify, lastidentifyreset } = userProfile;
  
  // Default values if fields don't exist yet
  remainingidentify = remainingidentify ?? 2;
  
  if (ispremium) {
    return { allowed: true }; // Premium users have unlimited identifies
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastResetDate = lastidentifyreset ? new Date(lastidentifyreset) : null;

  if (!lastResetDate || lastResetDate.toDateString() < today.toDateString()) {
    remainingidentify = 2; // Reset identifies daily to 2 for free users
    lastidentifyreset = today.toISOString().split('T')[0]; // Store as YYYY-MM-DD

    await supabase
      .from('profiles')
      .update({ remainingidentify, lastidentifyreset })
      .eq('id', userId);
  }

  if (remainingidentify <= 0) {
    return { allowed: false, error: 'Identify limit exceeded. Please upgrade to premium for unlimited identifies.' };
  }

  // Decrement identify count for free users
  remainingidentify--;
  await supabase
    .from('profiles')
    .update({ remainingidentify })
    .eq('id', userId);

  return { allowed: true };
}
