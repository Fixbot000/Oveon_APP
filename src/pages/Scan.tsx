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

const Scan = () => {
  const { user, isPremium } = useAuth();
  const [dailyScans, setDailyScans] = React.useState<number>(0);
  const [canScan, setCanScan] = React.useState<boolean>(true);
  const [lastScanDate, setLastScanDate] = React.useState<string | null>(null);
  const { toast } = useToast();
  
  
  // Check and reset daily scans at midnight
  const checkAndResetDailyScans = (storedLastScanDate: string | null, storedDailyScans: number) => {
    const today = new Date().toDateString();
    
    if (storedLastScanDate !== today) {
      // Reset daily scans for new day
      return { daily_scans: 0, last_scan_date: today };
    }
    
    return { daily_scans: storedDailyScans, last_scan_date: storedLastScanDate };
  };

  // Fetch and manage scan limits
  React.useEffect(() => {
    const fetchScanData = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('daily_scans, last_scan_date')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        const { daily_scans, last_scan_date } = checkAndResetDailyScans(
          data.last_scan_date, 
          data.daily_scans
        );
        
        // Update database if day has changed
        if (daily_scans !== data.daily_scans || last_scan_date !== data.last_scan_date) {
          await supabase
            .from('profiles')
            .update({ daily_scans, last_scan_date })
            .eq('id', user.id);
        }
        
        setDailyScans(daily_scans);
        setLastScanDate(last_scan_date);
        
        // Check if user can scan (free users limited to 3 per day, premium unlimited)
        setCanScan(isPremium || daily_scans < 3);
      }
    };
    
    fetchScanData();
  }, [user, isPremium]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={() => window.location.reload()} isPremium={isPremium} showBackButton={false} backButtonTarget="/" />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Device Scanner</h1>
            {!isPremium && (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {3 - dailyScans} scans left today
                </Badge>
                {!canScan && (
                  <p className="text-xs text-muted-foreground text-right">
                    You've reached your free scan limit for today.{' '}
                    <span className="text-primary">Upgrade to Premium for unlimited scans.</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <DiagnosticFlow selectedLanguage="en" canScan={canScan} onScanComplete={() => {
            if (!isPremium && user) {
              const newDailyScans = dailyScans + 1;
              setDailyScans(newDailyScans);
              setCanScan(newDailyScans < 3);
              
              // Update database
              supabase
                .from('profiles')
                .update({ 
                  daily_scans: newDailyScans,
                  last_scan_date: new Date().toDateString()
                })
                .eq('id', user.id);
            }
          }} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;