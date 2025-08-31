import React, { useState, useRef } from 'react';
import { Camera, Upload, Image, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Scan = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();

  // Fetch remaining scans for free users
  React.useEffect(() => {
    if (user && !isPremium) {
      fetchRemainingScans();
    }
  }, [user, isPremium]);

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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        setAnalysisResult(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG or PNG image.",
          variant: "destructive",
        });
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleScan = async () => {
    if (!selectedImage || !deviceName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select an image and enter a device name.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the scan feature.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsAnalyzing(true);

    try {
      const imageBase64 = await convertToBase64(selectedImage);

      const { data, error } = await supabase.functions.invoke('scan-device', {
        body: {
          imageBase64,
          deviceName: deviceName.trim()
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setAnalysisResult(data.analysis);
        if (!isPremium && data.remainingScans !== undefined) {
          setRemainingScans(data.remainingScans);
        }
        toast({
          title: "Analysis complete",
          description: "Your device has been analyzed successfully.",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      toast({
        title: "Scan failed",
        description: error.message || 'Failed to analyze the image. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setSelectedImage(null);
    setDeviceName('');
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} onRefresh={() => window.location.reload()} />
      
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

          {!analysisResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Scan Your Device
                </CardTitle>
                <CardDescription>
                  Upload an image of your device to get AI-powered analysis and repair suggestions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deviceName">Device Name</Label>
                  <Input
                    id="deviceName"
                    placeholder="e.g., iPhone 12, Samsung TV, Dell Laptop"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Select Image</Label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageSelect}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    {selectedImage ? (
                      <div className="space-y-2">
                        <Image className="w-8 h-8 mx-auto text-primary" />
                        <p className="text-sm font-medium">{selectedImage.name}</p>
                        <p className="text-xs text-muted-foreground">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload an image</p>
                        <p className="text-xs text-muted-foreground">JPEG or PNG only</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleScan} 
                  disabled={!selectedImage || !deviceName.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Scan Device'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Analysis Results
                </CardTitle>
                <CardDescription>
                  AI analysis for {deviceName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{analysisResult}</div>
                </div>
                <Button onClick={handleNewScan} className="w-full">
                  Scan Another Device
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;