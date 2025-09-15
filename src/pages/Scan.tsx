import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DiagnosticFlow from '@/components/DiagnosticFlow';
import { ScanLanguageSelector } from '@/components/ScanLanguageSelector';
import { useScanLanguage } from '@/hooks/useScanLanguage';
import { getScanTranslation } from '@/lib/scanTranslations';

const Scan = () => {
  const { user, isPremium } = useAuth();
  const [scansRemaining, setScansRemaining] = React.useState<number>(0);
  const [canScan, setCanScan] = React.useState<boolean>(true);
  const { toast } = useToast();
  const { selectedLanguage, changeLanguage } = useScanLanguage();

  // Check scan status on page load
  React.useEffect(() => {
    const checkScanStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.rpc('increment_scan_if_allowed', {
          p_user_id: user.id,
          p_check: true
        });
        
        if (!error && data) {
          const result = data as { success: boolean; remaining: number };
          if (result.remaining === -1) {
            // Premium user
            setScansRemaining(-1);
            setCanScan(true);
          } else {
            // Free user
            setScansRemaining(result.remaining);
            setCanScan(result.remaining > 0);
          }
        }
      } catch (error) {
        console.error('Error checking scan status:', error);
      }
    };
    
    checkScanStatus();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={() => window.location.reload()} isPremium={isPremium} showBackButton={false} backButtonTarget="/" />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{getScanTranslation(selectedLanguage, 'deviceScanner')}</h1>
            <div className="flex items-center gap-3">
              <ScanLanguageSelector 
                selectedLanguage={selectedLanguage}
                onLanguageChange={changeLanguage}
              />
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {isPremium ? getScanTranslation(selectedLanguage, 'unlimitedScans') : `${scansRemaining} ${getScanTranslation(selectedLanguage, 'scansLeft')}`}
                </Badge>
                {!canScan && (
                  <p className="text-xs text-muted-foreground text-right">
                    {getScanTranslation(selectedLanguage, 'scanLimitReached')}{' '}
                    <span className="text-primary">{getScanTranslation(selectedLanguage, 'upgradeToPremium')}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <DiagnosticFlow selectedLanguage={selectedLanguage} canScan={canScan} onScanComplete={async () => {
            if (!user) return;
            
            try {
              const { data, error } = await supabase.rpc('increment_scan_if_allowed', {
                p_user_id: user.id,
                p_check: false
              });
              
              if (!error && data) {
                const result = data as { success: boolean; remaining: number };
                if (result.success) {
                  if (result.remaining === -1) {
                    // Premium user
                    setScansRemaining(-1);
                    setCanScan(true);
                  } else {
                    // Free user
                    setScansRemaining(result.remaining);
                    setCanScan(result.remaining > 0);
                  }
                } else {
                  // Scan limit reached
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
          }} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;