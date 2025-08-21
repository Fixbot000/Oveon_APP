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
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>AI Scan Feature</CardTitle>
              <CardDescription>
                The AI diagnostic pipeline has been removed. This feature is temporarily unavailable.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                For device diagnostics, please use the Chat feature instead.
              </p>
              <Button 
                onClick={() => window.location.href = '/chat'}
                className="w-full"
              >
                Go to Chat Diagnosis
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;