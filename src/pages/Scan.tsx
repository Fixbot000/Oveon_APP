import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DiagnosticFlow from '@/components/DiagnosticFlow';
import LanguageSelector from '@/components/LanguageSelector';
import { motion } from 'framer-motion';
import { AdMob, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';
import { initializeAdMobIfNeeded, showInterstitialAd } from '@/lib/utils'; // Import the new function
import CircuitCard from '@/components/CircuitCard';
import { useNavigate } from 'react-router-dom';
import AbstractDesign from '@/assets/abstract-banner-design.svg'; // Import the new SVG

const Scan = () => {
  const { user, isPremium, loading } = useAuth();
  const [scansRemaining, setScansRemaining] = React.useState<number>(0);
  const [canScan, setCanScan] = React.useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>('en');
  const { toast } = useToast();
  const [adsWatchedCount, setAdsWatchedCount] = React.useState<number>(0);
  const AD_WATCH_LIMIT = 3;

  const navigate = useNavigate();

  const handleNavigateToCircuitPage = () => {
    navigate('/circuit'); // Assuming '/circuit' is the route for CircuitPage
  };

  // Function to handle scan completion logic
  const handleScanCompletion = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('increment_scan_if_allowed', {
        p_user_id: user.id,
        p_check: false
      });

      if (!error && data) {
        const result = data as { success: boolean; remaining: number };
        if (result.success) {
          toast({
            title: "Scan completed",
            description: "Your device scan has been completed successfully.",
          });
          // Re-fetch scan status to update UI based on new daily_scan_limit
          checkScanStatus();
        } else {
          // Scan limit reached (already handled by increment_scan_if_allowed RPC)
          // The checkScanStatus will update the state correctly
          // For now, we can ensure the UI reflects a limit if not already.
          setCanScan(false);
          setScansRemaining(0);
          toast({
            title: "Scan limit reached",
            description: "You've reached your free scan limit for today. Upgrade to Premium for unlimited scans.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error updating scan count:', error);
    }
  };

  // Initialize AdMob and set up rewarded ad event listeners on component mount
  React.useEffect(() => {
    // Initialize AdMob if not already initialized (safe to call multiple times)
    // AdMob.initialize({
    //   initializeForTesting: true, // Enable test ads during development
    // });
    initializeAdMobIfNeeded(); // Use the shared initialization function

    // Listen for rewarded ad dismissal event
    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      // toast({
      //   title: "Ad Dismissed",
      //   description: "You closed the ad before it finished.",
      //   variant: "destructive",
      // });
      // After dismissal, try loading another ad for the next interaction
      loadRewardedAd();
    });

    // Listen for rewarded ad reward event
    AdMob.addListener(RewardAdPluginEvents.Rewarded, async (reward: AdMobRewardItem) => {
      if (reward && user) {
        try {
          // Call Supabase function to grant an extra scan
          const { data, error } = await supabase.rpc('grant_extra_scan', {
            p_user_id: user.id,
          });

          if (error) {
            console.error("Error granting extra scan in Supabase:", error);
            toast({
              title: "Error",
              description: error.message === 'ads_limit_reached' ? "Ad watch limit reached. Try again in 24h." : "Failed to grant extra scan. Please try again.",
              variant: "destructive",
            });
            return;
          }

          // Update local state based on Supabase response
          const result = data as { success: boolean; remaining: number };
          if (result.success) {
            // The remaining scans will be updated by the `checkScanStatus` useEffect
            // after the state change triggers a re-render.
            // For now, we can optimistically update the UI or re-fetch scan status.
            // Re-fetching scan status is safer to ensure consistency with backend.
            checkScanStatus();
            // toast({
            //   title: "Scan Granted!",
            //   description: `You earned ${reward.amount} ${reward.type} for watching an ad!`,
            // });
          } else {
            console.error("Supabase did not grant extra scan:", result);
            toast({
              title: "Error",
              description: "Supabase failed to grant extra scan. Please try again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Unexpected error during Supabase call:", error);
          toast({
            title: "Error",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        }
      }
      // Load another ad for the next interaction, regardless of reward
      loadRewardedAd();
    });

    // Preload a rewarded ad at startup
    loadRewardedAd();

    // Clean up event listeners on component unmount
    return () => {
      AdMob.removeAllListeners();
    };
  }, [user, toast]); // Dependencies for useEffect

  // Function to load a rewarded ad
  const loadRewardedAd = async () => {
    // Do not load ads for premium users
    if (isPremium) return;
    
    try {
      // Prepare the rewarded video ad for display
      await AdMob.prepareRewardVideoAd({
        adId: "ca-app-pub-6931186438015318/6064430296", // Real Google AdMob rewarded ad unit ID
        isTesting: false, // Disable testing for this specific ad unit
      });
    } catch (error) {
      console.error("Error loading rewarded ad:", error); // Log any loading errors
      toast({
        title: "Ad Load Error",
        description: "Loading ads, please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to show the loaded rewarded ad
  const showRewardedAd = async () => {
    // Do not show ads for premium users
    if (isPremium) return;

    try {
      // Display the rewarded video ad fullscreen
      await AdMob.showRewardVideoAd();
    } catch (error) {
      console.error("Error showing rewarded ad:", error); // Log any showing errors
      // toast({
      //   title: "Ad Display Error",
      //   description: "Failed to show ad. Please try again later.",
      //   variant: "destructive",
      // });
      // Attempt to load another ad if displaying fails
      loadRewardedAd();
    }
  };

  // Function to fetch scan status
  const fetchScanStatus = React.useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('increment_scan_if_allowed', {
        p_user_id: user.id,
        p_check: true // Set to true to only check and not increment
      });

      if (!error && data) {
        const result = data as { success: boolean; remaining: number; ads_watched: number };
        if (result.remaining === -1) {
          // Premium user
          setScansRemaining(-1);
          setCanScan(true);
          setAdsWatchedCount(0); // Premium users don't have ad limits
        } else {
          // Free user
          setScansRemaining(result.remaining);
          setCanScan(result.remaining > 0);
          setAdsWatchedCount(result.ads_watched);
        }
      } else if (error) {
        console.error('Error checking scan status:', error);
        // Handle the error appropriately, e.g., show a toast message
      }
    } catch (error) {
      console.error('Error checking scan status:', error);
      // Handle the error appropriately
    }
  }, [user]); // Only re-create if user changes


  // Check scan status on page load (existing logic, moved slightly to avoid conflict)
      React.useEffect(() => {
        fetchScanStatus();
      }, [user, fetchScanStatus]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-bold">Device Scanner</h1>
            <div className="flex flex-col items-end gap-3">
              {false && (
                <LanguageSelector 
                  value={selectedLanguage} 
                  onChange={setSelectedLanguage} 
                />
              )}
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {isPremium ? "Unlimited scans" : `${scansRemaining} scans left today`}
                </Badge>
                {!canScan && (
                  <p className="text-xs text-muted-foreground text-right">
                    You've reached your free scan limit for today. Upgrade to Premium for unlimited scans.
                  </p>
                )}
              </div>
                  {!loading && isPremium === false && (
                    <div className="bg-yellow-500 p-2 rounded-md mt-4 inline-flex items-center justify-center">
                      {adsWatchedCount < AD_WATCH_LIMIT ? (
                        <Button variant="link" className="text-black p-0 h-auto" onClick={showRewardedAd}>
                          Need more scans?
                        </Button>
                      ) : (
                        <p className="text-xs text-black text-center font-bold" onClick={() => showInterstitialAd(isPremium)}>
                          Limit reached. Try again in 24h.
                        </p>
                      )}
                    </div>
                  )}
                   
            </div>
          </div>
          {/* Circuit Generator card hidden as requested by user */}
          {/* <CircuitCard
            title="CIRCUIT GENERATOR"
            description="Generate circuit diagrams from text descriptions"
            onClick={handleNavigateToCircuitPage}
            abstractDesignImage={AbstractDesign}
            titleColorClass="text-white"
            descriptionColorClass="text-gray-200"
            cardBgClass="bg-gradient-to-br from-blue-600 to-blue-800"
          /> */}

          <DiagnosticFlow selectedLanguage={selectedLanguage} canScan={canScan} onScanComplete={handleScanCompletion} 
          loadingComponent={(
            <motion.div
              initial={{ x: -50, opacity: 1 }}
              animate={{ x: 50, opacity: 1 }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 1,
                ease: "easeInOut",
              }}
            >
              <div className="pentagon-loader"></div>
            </motion.div>
          )}
        />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;