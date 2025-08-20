import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Camera, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';
import { DiagnosticResults } from './DiagnosticResults';

interface DiagnosticSession {
  id: string;
  status: 'analyzing' | 'completed' | 'failed';
  aiAnalysis?: any;
  databaseMatches?: any[];
  repairGuidance?: any;
  backupSearchResults?: any;
}

export const DiagnosticFlow: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [symptomsText, setSymptomsText] = useState('');
  const [deviceCategory, setDeviceCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [session, setSession] = useState<DiagnosticSession | null>(null);

  const handleImageSelection = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setSelectedImages(files);
  }, []);

  const uploadImages = async () => {
    if (!user || selectedImages.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls = [];

    try {
      for (const image of selectedImages) {
        const fileName = `${user.id}/${Date.now()}_${image.name}`;
        const { data, error } = await supabase.storage
          .from('device-images')
          .upload(fileName, image);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('device-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setImageUrls(uploadedUrls);
      toast.success('Images uploaded successfully');
      return uploadedUrls;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const startDiagnosis = async () => {
    if (!user) {
      toast.error('Please sign in to use diagnostics');
      return;
    }

    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    if (!deviceCategory) {
      toast.error('Please select a device category');
      return;
    }

    setIsAnalyzing(true);
    setProgress(10);

    try {
      // Upload images first
      const urls = await uploadImages();
      if (urls.length === 0) return;

      setProgress(20);

      // Create diagnostic session
      const { data: sessionData, error: sessionError } = await supabase
        .from('diagnostic_sessions')
        .insert({
          user_id: user.id,
          image_urls: urls,
          symptoms_text: symptomsText,
          device_category: deviceCategory,
          status: 'analyzing'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setSession({
        id: sessionData.id,
        status: 'analyzing'
      });

      setProgress(30);

      // Start analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-device', {
        body: {
          sessionId: sessionData.id,
          imageUrls: urls,
          symptomsText,
          deviceCategory
        }
      });

      if (analysisError) throw analysisError;

      setProgress(100);

      // Update session with results
      setSession({
        id: sessionData.id,
        status: 'completed',
        aiAnalysis: analysisResult.aiAnalysis,
        databaseMatches: analysisResult.databaseMatches,
        repairGuidance: analysisResult.repairGuidance,
        backupSearchResults: analysisResult.backupResults
      });

      setCurrentStep(4); // Show results
      toast.success('Diagnosis completed successfully!');

    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Diagnosis failed. Please try again.');
      setSession(prev => prev ? { ...prev, status: 'failed' } : null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setSelectedImages([]);
    setImageUrls([]);
    setSymptomsText('');
    setDeviceCategory('');
    setSession(null);
    setProgress(0);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            {step}
          </div>
          {step < 4 && (
            <div className={`
              w-12 h-1 mx-2
              ${currentStep > step ? 'bg-primary' : 'bg-muted'}
            `} />
          )}
        </div>
      ))}
    </div>
  );

  if (currentStep === 4 && session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <DiagnosticResults session={session} onStartNew={resetFlow} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {renderStepIndicator()}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Device Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images">Select up to 5 images of your device</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelection}
                className="mt-2"
              />
            </div>
            
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {selectedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/75 text-white px-2 py-1 rounded text-xs">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={() => setCurrentStep(2)} 
              disabled={selectedImages.length === 0}
              className="w-full"
            >
              Continue to Category Selection
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Device Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="category">What type of device are you diagnosing?</Label>
              <Select value={deviceCategory} onValueChange={setDeviceCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select device category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="device">Electronic Device</SelectItem>
                  <SelectItem value="instrument">Measuring Instrument</SelectItem>
                  <SelectItem value="component">Electronic Component</SelectItem>
                  <SelectItem value="pcb">PCB/Circuit Board</SelectItem>
                  <SelectItem value="board">Development Board</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)} 
                disabled={!deviceCategory}
                className="flex-1"
              >
                Continue to Symptoms
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Symptoms & Description (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="symptoms">Describe any symptoms or issues you've noticed</Label>
              <Textarea
                id="symptoms"
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="e.g., Device won't turn on, makes strange noises, overheating, display issues..."
                className="mt-2 min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground mt-2">
                This is optional but helps provide more accurate diagnosis
              </p>
            </div>

            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing your device...</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={startDiagnosis} 
                disabled={isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? 'Analyzing...' : 'Start Diagnosis'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};