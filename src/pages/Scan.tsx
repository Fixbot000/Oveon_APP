import { Camera, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

const Scan = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} />
      
      <main className="px-4 py-6">
        <div className="text-center py-8">
          <Camera className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">AI Diagnostic Scan</h2>
          <p className="text-muted-foreground">AI pipeline temporarily unavailable</p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;