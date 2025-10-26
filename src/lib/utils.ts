import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';

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
