import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { useAuth } from '@/hooks/useAuth';
import { canUseFeature, grantExtraFeatureUsage, initializeAdMobIfNeeded } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AdMob, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';

const CircuitGenerator: React.FC = () => {
  const [description, setDescription] = useState<string>('');
  const [circuitData, setCircuitData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { user, isPremium } = useAuth();
  const [usageInfo, setUsageInfo] = useState<{ allowed: boolean; usageCount?: number; usageLimit?: number; adsWatchedCount?: number }>(
    { allowed: true }
  );
  const navigate = useNavigate();
  const [adLoaded, setAdLoaded] = useState(false);

  // Initialize AdMob
  useEffect(() => {
    const initAdMob = async () => {
      await initializeAdMobIfNeeded();
      await loadRewardedAd();
    };
    
    initAdMob();
    
    // Set up event listeners for rewarded ads
    AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      handleAdRewarded();
    });
    
    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      loadRewardedAd(); // Reload ad after it's dismissed
    });
    
    return () => {
      AdMob.removeAllListeners();
    };
  }, []);

  // Load rewarded ad
  const loadRewardedAd = async () => {
    try {
      setAdLoaded(false); // Show loading state
      await AdMob.prepareRewardVideoAd({
        adId: 'ca-app-pub-3940256099942544/5224354917', // Test ad ID
        isTesting: true,
      });
      setAdLoaded(true);
    } catch (error) {
      console.error('Failed to load rewarded ad:', error);
      setAdLoaded(false);
      setError("Ad failed to load. Please try again later.");
    }
  };

  // Show rewarded ad
  const showRewardedAd = async () => {
    try {
      if (adLoaded) {
        await AdMob.showRewardVideoAd();
      } else {
        setError("Ad not ready. Please try again in a moment.");
        await loadRewardedAd();
      }
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      setError("Error showing ad. Please try again later.");
    }
  };

  // Handle ad reward
  const handleAdRewarded = async () => {
    if (user?.id) {
      const result = await grantExtraFeatureUsage('circuit', user.id);
      if (result.success) {
        setError(null);
        
        // Update usage info
        const updatedUsageInfo = await canUseFeature('circuit', user.id);
        setUsageInfo(updatedUsageInfo);
        
        // Reload ad for next time
        loadRewardedAd();
      } else if (result.error === 'ads_limit_reached') {
        setError("Daily ad limit reached. You've watched the maximum number of ads today.");
      } else {
        setError("Error granting extra usage. Please try again later.");
      }
    }
  };

  useEffect(() => {
    const checkUsageAllowed = async () => {
      if (user) {
        const result = await canUseFeature('circuit', user.id);
        setUsageInfo(result);
      }
    };
    
    checkUsageAllowed();
  }, [user]);

  const generateCircuit = async () => {
    setLoading(true);
    setError(null);
    setCircuitData(null);

    if (!description) {
      setError("Please enter a circuit description.");
      setLoading(false);
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error fetching session:", sessionError);
      setError("Authentication error: Could not retrieve user session.");
      setLoading(false);
      return;
    }

    if (!session) {
      setError("You must be logged in to generate a circuit.");
      setLoading(false);
      return;
    }

    // Check if user can use this feature
    if (user) {
      const featureAccess = await canUseFeature('circuit', user.id);
      setUsageInfo(featureAccess);
      
      if (!featureAccess.allowed) {
        setError(isPremium 
          ? "An error occurred checking your premium status." 
          : "You've reached your daily limit (2/day). Upgrade to premium for unlimited access.");
        setLoading(false);
        return;
      }
    }

    const jwt = session.access_token;

    try {
      const response = await fetch('https://djxdbltjwqavzhpkrnzr.supabase.co/functions/v1/generateCircuit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'apikey': 'sb_publishable_-hCLsCohcSo-LpyiHMCqQ_NpcdapYz',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate circuit.');
      }

      const data = await response.json();
      if (data && data.result) {
        setCircuitData({
          circuitSummary: data.result["Circuit Summary"],
          componentsList: data.result["Components List"],
          connectionWorkingDetails: data.result["Connection/Working Details"],
          logicTable: data.result["Logic Table"],
          asciiDiagram: data.result["ASCII/Text-based Circuit Diagram"],
        });
      } else {
        setError("Unexpected response format.");
      }
    } catch (err: any) {
      console.error("Error during circuit generation fetch:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Circuit Description
            {!isPremium && usageInfo.usageCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {usageInfo.usageCount}/{usageInfo.usageLimit} uses today
              </span>
            )}
            {isPremium && (
              <span className="text-xs text-primary">Premium ✓</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!usageInfo.allowed && !isPremium ? (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Daily Limit Reached</h3>
              <p className="text-muted-foreground mb-2">Watch an ad for one more use or upgrade to Premium</p>
              <div className="flex flex-col gap-2 w-full">
                <Button
                   onClick={showRewardedAd}
                   variant="default"
                   className="bg-green-600 hover:bg-green-700"
                   disabled={!adLoaded || (usageInfo?.adsWatchedCount && usageInfo.adsWatchedCount >= 3)}
                 >
                   {!adLoaded ? (
                     <span className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       Loading Ad...
                     </span>
                   ) : usageInfo?.adsWatchedCount && usageInfo.adsWatchedCount >= 3 
                     ? "Ad Limit Reached (3/3)" 
                     : "Watch Ad for More Uses"}
                 </Button>
                <Button onClick={() => navigate('/premium')} variant="default">
                  Upgrade to Premium
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="circuitDescription">Describe Your Desired Circuit</Label>
                <Textarea
                  id="circuitDescription"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., A simple LED circuit with a resistor and a 9V battery."
                />
              </div>
              <Button
                onClick={generateCircuit}
                disabled={loading || !description.trim()}
                className="w-full"
              >
                {loading ? 'Generating...' : 'Generate Circuit'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {circuitData && (
        <div className="mt-4 space-y-4">
          {circuitData.circuitSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Circuit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{circuitData.circuitSummary}</p>
              </CardContent>
            </Card>
          )}
          {circuitData.componentsList && (
            <Card>
              <CardHeader>
                <CardTitle>Components List</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap">{circuitData.componentsList}</pre>
              </CardContent>
            </Card>
          )}
          {circuitData.connectionWorkingDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Connection/Working Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap">{circuitData.connectionWorkingDetails}</pre>
              </CardContent>
            </Card>
          )}
          {circuitData.logicTable && (
            <Card>
              <CardHeader>
                <CardTitle>Logic Table</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap">{circuitData.logicTable}</pre>
              </CardContent>
            </Card>
          )}
          {circuitData.asciiDiagram && (
            <Card>
              <CardHeader>
                <CardTitle>Circuit Diagram</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-sm">{circuitData.asciiDiagram}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CircuitGenerator;
