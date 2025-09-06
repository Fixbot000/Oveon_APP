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
  const [remainingScans, setRemainingScans] = React.useState<number | null>(null);
  const { toast } = useToast();
  
  // Fetch remaining scans for free users
  React.useEffect(() => {
    const fetchRemainingScans = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('remainingscans')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setRemainingScans(data.remainingscans);
      }
    };
    if (user && !isPremium) {
      fetchRemainingScans();
    }
  }, [user, isPremium]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={() => window.location.reload()} isPremium={isPremium} showBackButton={true} backButtonTarget="/" />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Device Scanner</h1>
            {!isPremium && remainingScans !== null && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {remainingScans} scans left today
              </Badge>
            )}
          </div>

          <DiagnosticFlow selectedLanguage="en" />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;