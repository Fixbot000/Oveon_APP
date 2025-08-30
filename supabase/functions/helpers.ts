import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

interface UserProfile {
  isPremium: boolean;
  remainingScans: number;
  lastScanReset: string | null;
}

export async function checkPremiumAndScans(userId: string, supabaseServiceRoleKey: string, supabaseUrl: string): Promise<{ allowed: boolean; error?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('isPremium, remainingScans, lastScanReset')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile for scan check:', profileError);
    return { allowed: false, error: 'Failed to retrieve user profile for scan check.' };
  }

  let { isPremium, remainingScans, lastScanReset } = userProfile;

  if (isPremium) {
    return { allowed: true }; // Premium users have unlimited scans
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastResetDate = lastScanReset ? new Date(lastScanReset) : null;

  if (!lastResetDate || lastResetDate.toDateString() < today.toDateString()) {
    remainingScans = 3; // Reset scans daily
    lastScanReset = today.toISOString().split('T')[0]; // Store as YYYY-MM-DD

    await supabase
      .from('profiles')
      .update({ remainingScans, lastScanReset })
      .eq('id', userId);
  }

  if (remainingScans <= 0) {
    return { allowed: false, error: 'Scan limit exceeded. Please upgrade to premium for unlimited scans.' };
  }

  // Decrement scan count for free users
  remainingScans--;
  await supabase
    .from('profiles')
    .update({ remainingScans })
    .eq('id', userId);

  return { allowed: true };
}
