import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { supabase } from '@/integrations/supabase/client'

// A flag to ensure AdMob is initialized only once
let admobInitialized = false;

/**
 * Initializes AdMob if it hasn't been initialized already.
 * This is a safeguard to prevent multiple initializations across the app.
 */
export const initializeAdMobIfNeeded = async () => {
  if (admobInitialized) {
    return; // Already initialized
  }

  let attempts = 0;
  const maxAttempts = 30;
  const delayMs = 1000; // 1000ms delay between attempts

  while (!window.AdMob && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    attempts++;
  }

  if (!window.AdMob) {
    console.error('AdMob plugin still not available after multiple retries. Aborting initialization.');
    return;
  }

  try {
    await AdMob.initialize({
      initializeForTesting: false, // Disable test ads for production
    });
    console.log('AdMob initialized successfully.');
    admobInitialized = true;
  } catch (e) {
    console.error('Error initializing AdMob:', e);
  }
};

/**
 * Loads and displays an interstitial ad.
 * This function should be called for free users at appropriate points in the app flow.
 */
export const showInterstitialAd = async (isPremium: boolean) => {
  // Do not show ads for premium users
  if (isPremium) {
    console.log('Premium user, skipping interstitial ad.');
    return;
  }

  // Ensure AdMob is initialized before trying to show an ad
  await initializeAdMobIfNeeded();

  try {
    // Prepare the interstitial ad using the official Google test ad unit ID
    await AdMob.prepareInterstitial({
      adId: (await AdMob.getAdId({ adUnitName: 'admob_interstitial_ad_unit_id' })).adId, // Get ad ID from native resources
      isTesting: false, // Set to false for production
    });

    // Add event listeners for the interstitial ad's lifecycle
    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      // Log when the interstitial ad has loaded successfully
      console.log('Interstitial ad loaded successfully');
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
      // Log any errors that occur during ad loading
      console.error('Interstitial ad failed to load:', error);
    });

    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      // Log when the interstitial ad is dismissed by the user
      console.log('Interstitial ad closed by user');
    });

    // Display the interstitial ad in fullscreen
    await AdMob.showInterstitial();

  } catch (error) {
    // Catch and log any errors that occur during the ad showing process
    console.error('Error showing interstitial ad:', error);
  }
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Feature usage tracking for free users
export async function trackFeatureUsage(featureType: 'identify' | 'circuit', userId: string, incrementCount = true) {
  try {
    // Get current usage data
    const { data, error } = await supabase
      .from('profiles')
      .select('feature_usage, ads_watched_count, last_ads_reset')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Initialize or update feature usage tracking
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let featureUsage = data?.feature_usage || {};
    let adsWatchedCount = data?.ads_watched_count || 0;
    const lastAdsReset = data?.last_ads_reset || null;
    
    // Reset ads_watched_count if it's a new day
    if (!lastAdsReset || lastAdsReset < today) {
      adsWatchedCount = 0;
      
      // Update the last_ads_reset date
      await supabase
        .from('profiles')
        .update({ ads_watched_count: 0, last_ads_reset: today })
        .eq('id', userId);
    }
    
    if (!featureUsage[featureType]) {
      featureUsage[featureType] = { date: today, count: 0 };
    }
    
    // Reset count if it's a new day
    if (featureUsage[featureType].date !== today) {
      featureUsage[featureType].date = today;
      featureUsage[featureType].count = 0;
    }
    
    // Increment usage count if requested
    if (incrementCount) {
      featureUsage[featureType].count++;
    }
    
    // Update the database if incrementing
    if (incrementCount) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ feature_usage: featureUsage })
        .eq('id', userId);
        
      if (updateError) throw updateError;
    }
    
    // Return current usage count for today
    return { 
      count: featureUsage[featureType].count,
      limit: 2, // Daily limit for free users
      allowed: featureUsage[featureType].count <= 2, // Check if under limit
      adsWatchedCount
    };
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    return { count: 0, limit: 2, allowed: false, adsWatchedCount: 0 };
  }
}

// Check if user can use premium feature
export async function canUseFeature(featureType: 'identify' | 'circuit', userId: string) {
  try {
    // Check if user is premium
    const { data, error } = await supabase
      .from('profiles')
      .select('ispremium, ads_watched_count')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    // Premium users have unlimited access
    if (data?.ispremium) {
      return { allowed: true, isPremium: true };
    }
    
    // For free users, track and check usage limits
    const usage = await trackFeatureUsage(featureType, userId, false); // Don't increment, just check
    return { 
      allowed: usage.allowed, 
      isPremium: false,
      usageCount: usage.count,
      usageLimit: usage.limit,
      adsWatchedCount: usage.adsWatchedCount
    };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return { allowed: false, isPremium: false };
  }
}

// Grant extra feature usage after watching an ad
export async function grantExtraFeatureUsage(featureType: 'identify' | 'circuit', userId: string) {
  try {
    // Get current usage data
    const { data, error } = await supabase
      .from('profiles')
      .select('feature_usage, ads_watched_count')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Check if ads watched limit is reached (3 per day)
    const adsWatchedCount = data?.ads_watched_count || 0;
    if (adsWatchedCount >= 3) {
      return { 
        success: false, 
        error: 'ads_limit_reached',
        adsWatchedCount
      };
    }
    
    // Increment ads watched count
    const newAdsWatchedCount = adsWatchedCount + 1;
    
    // Update feature usage to grant one more use
    let featureUsage = data?.feature_usage || {};
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!featureUsage[featureType]) {
      featureUsage[featureType] = { date: today, count: 0 };
    }
    
    // Ensure we're working with today's data
    if (featureUsage[featureType].date !== today) {
      featureUsage[featureType].date = today;
      featureUsage[featureType].count = 0;
    }
    
    // Decrement the count to effectively grant one more use
    if (featureUsage[featureType].count > 0) {
      featureUsage[featureType].count--;
    }
    
    // Update the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        feature_usage: featureUsage,
        ads_watched_count: newAdsWatchedCount
      })
      .eq('id', userId);
      
    if (updateError) throw updateError;
    
    // Return updated usage info
    return { 
      success: true,
      usageCount: featureUsage[featureType].count,
      usageLimit: 2,
      allowed: true,
      adsWatchedCount: newAdsWatchedCount
    };
  } catch (error) {
    console.error('Error granting extra feature usage:', error);
    return { success: false, error: 'unknown_error' };
  }
}
