import React, { useState, useCallback } from 'react';
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

interface InitialAnalysis {
  visualAnalysis: string;
  likelyProblem: string;
  confirmationQuestions: string[];
}

export const DiagnosticFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [symptomsText, setSymptomsText] = useState('');
  const [deviceCategory, setDeviceCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [initialAnalysis, setInitialAnalysis] = useState<InitialAnalysis | null>(null);
  const [confirmationAnswers, setConfirmationAnswers] = useState<Record<string, string>>({});
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});

  const handleImageSelection = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setSelectedImages(files);
  }, []);

  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls = [];

    try {
      for (const image of selectedImages) {
        const fileName = `anonymous/${Date.now()}_${image.name}`;
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

  const performInitialAnalysis = async () => {
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

      setProgress(40);

      // Perform initial image analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('initial-image-analysis', {
        body: {
          imageUrls: urls,
          deviceCategory
        }
      });

      if (analysisError) throw analysisError;

      setProgress(100);
      setInitialAnalysis(analysisResult);
      setCurrentStep(3); // Go to confirmation questions
      toast.success('Initial analysis completed!');

    } catch (error) {
      console.error('Initial analysis error:', error);
      toast.error('Initial analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const generateFollowUpQuestions = async (description: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('text-diagnosis', {
        body: {
          message: `Based on this description: "${description}", generate 3-5 specific follow-up questions to better understand the problem. Return only a JSON array of questions.`,
          deviceType: deviceCategory,
          isFollowUp: true
        }
      });

      if (error) throw error;

      // Extract questions from the response
      const questions = result.followUpQuestions || [
        "When did this problem first occur?",
        "Does the issue happen consistently or intermittently?",
        "Have you tried any troubleshooting steps already?"
      ];
      
      setFollowUpQuestions(questions);
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      // Set default follow-up questions
      setFollowUpQuestions([
        "When did this problem first occur?",
        "Does the issue happen consistently or intermittently?",
        "Have you tried any troubleshooting steps already?"
      ]);
    }
  };

  const startDiagnosis = async () => {
    if (!symptomsText.trim()) {
      toast.error('Please provide a description of the problem');
      return;
    }

    setIsAnalyzing(true);
    setProgress(10);

    try {
      setProgress(20);

      // Create diagnostic session
      const { data: sessionData, error: sessionError } = await supabase
        .from('diagnostic_sessions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // anonymous user
          image_urls: imageUrls,
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

      setProgress(40);

      // Prepare enhanced symptoms text with Q&A
      let enhancedSymptoms = symptomsText;
      
      if (Object.keys(confirmationAnswers).length > 0) {
        enhancedSymptoms += '\n\nConfirmation Q&A:\n';
        Object.entries(confirmationAnswers).forEach(([question, answer]) => {
          if (answer.trim()) {
            enhancedSymptoms += `Q: ${question}\nA: ${answer}\n\n`;
          }
        });
      }

      if (Object.keys(followUpAnswers).length > 0) {
        enhancedSymptoms += '\nFollow-up Q&A:\n';
        Object.entries(followUpAnswers).forEach(([question, answer]) => {
          if (answer.trim()) {
            enhancedSymptoms += `Q: ${question}\nA: ${answer}\n\n`;
          }
        });
      }

      if (initialAnalysis) {
        enhancedSymptoms += `\nInitial AI Analysis:\n${initialAnalysis.visualAnalysis}\nLikely Problem: ${initialAnalysis.likelyProblem}`;
      }

      setProgress(60);

      // Start full analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-device', {
        body: {
          sessionId: sessionData.id,
          imageUrls: imageUrls,
          symptomsText: enhancedSymptoms,
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

      setCurrentStep(5); // Show results
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
    setInitialAnalysis(null);
    setConfirmationAnswers({});
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            {step}
          </div>
          {step < 5 && (
            <div className={`
              w-12 h-1 mx-2
              ${currentStep > step ? 'bg-primary' : 'bg-muted'}
            `} />
          )}
        </div>
      ))}
    </div>
  );

  if (currentStep === 5 && session) {
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

            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing images...</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={performInitialAnalysis} 
                disabled={!deviceCategory || isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Images'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && initialAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis & Confirmation Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Initial Analysis:</h4>
              <p className="text-sm text-muted-foreground mb-3">{initialAnalysis.visualAnalysis}</p>
              <div className="bg-background p-3 rounded border">
                <h5 className="font-medium text-sm">Likely Problem:</h5>
                <p className="text-sm">{initialAnalysis.likelyProblem}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">Confirmation Questions (All Optional - Skip Any You Can't Answer)</h4>
              <div className="space-y-4">
                {initialAnalysis.confirmationQuestions.map((question, index) => (
                  <div key={index}>
                    <Label htmlFor={`confirm-${index}`} className="text-sm">{question}</Label>
                    <Textarea
                      id={`confirm-${index}`}
                      value={confirmationAnswers[question] || ''}
                      onChange={(e) => setConfirmationAnswers(prev => ({
                        ...prev,
                        [question]: e.target.value
                      }))}
                      placeholder="Your answer (optional)..."
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setCurrentStep(4)} className="flex-1">
                Continue to Description
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Problem Description *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="symptoms">Describe the problem in detail *</Label>
              <Textarea
                id="symptoms"
                value={symptomsText}
                onChange={(e) => {
                  setSymptomsText(e.target.value);
                  if (e.target.value.trim() && followUpQuestions.length === 0) {
                    generateFollowUpQuestions(e.target.value);
                  }
                }}
                placeholder="Please describe what's wrong with your device, when the problem started, what you were doing when it occurred, etc..."
                className="mt-2 min-h-[120px]"
                required
              />
              <p className="text-sm text-red-500 mt-2">
                * This field is required
              </p>
            </div>

            {followUpQuestions.length > 0 && symptomsText.trim() && (
              <div>
                <h4 className="font-medium mb-3">Follow-up Questions (Optional)</h4>
                <div className="space-y-3">
                  {followUpQuestions.map((question, index) => (
                    <div key={index}>
                      <Label htmlFor={`followup-${index}`} className="text-sm">{question}</Label>
                      <Textarea
                        id={`followup-${index}`}
                        value={followUpAnswers[question] || ''}
                        onChange={(e) => setFollowUpAnswers(prev => ({
                          ...prev,
                          [question]: e.target.value
                        }))}
                        placeholder="Your answer (optional)..."
                        className="mt-1 min-h-[60px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 You should answer the questions for a proper and accurate solution.
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
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={startDiagnosis} 
                disabled={isAnalyzing || !symptomsText.trim()}
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