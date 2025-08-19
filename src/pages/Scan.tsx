import { Camera, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

const Scan = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} />
      
      <main className="px-4 py-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Scan & Diagnose</h2>
          <p className="text-muted-foreground">
            Upload photos of your device for AI-powered analysis
          </p>
        </div>

        <div className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-2 border-dashed border-primary/30">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="p-4 bg-gradient-primary rounded-full w-fit mx-auto">
                  <Camera className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Take Photo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use your camera to capture the device or component
                  </p>
                  <Button className="bg-gradient-primary">
                    <Camera className="h-4 w-4 mr-2" />
                    Open Camera
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-muted-foreground">
            <span>or</span>
          </div>

          <Card className="bg-card shadow-card">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="p-4 bg-accent rounded-full w-fit mx-auto">
                  <Upload className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Upload from Gallery</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select photos from your device
                  </p>
                  <Button variant="outline">
                    <Image className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tips for better results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <CardDescription>
                  Ensure good lighting and focus on the device or component
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <CardDescription>
                  Take multiple angles for better analysis
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <CardDescription>
                  Include any visible damage or problem areas
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;