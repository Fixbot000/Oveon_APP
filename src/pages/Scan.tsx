import { Camera, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { DiagnosticFlowV3 } from '@/components/DiagnosticFlowV3';

const Scan = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} />
      
      <main className="px-4 py-6">
        <DiagnosticFlowV3 />
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;