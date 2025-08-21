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
import { Upload, Camera, AlertTriangle, CheckCircle, Clock, Info, SkipForward } from 'lucide-react';
import { DiagnosticResults } from './DiagnosticResults';

interface DiagnosticSession {
  id: string;
  status: 'analyzing' | 'completed' | 'failed';
  aiAnalysis?: any;
}

interface ImageAnalysis {
  likelyProblems: string[];
  confidence: string;
  visualObservations: string;
  clarifyingQuestions: string[];
}

export const DiagnosticFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [deviceCategory, setDeviceCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Analysis and questions
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');
  const [descriptionQuestions, setDescriptionQuestions] = useState<string[]>([]);
  const [descriptionAnswers, setDescriptionAnswers] = useState<Record<string, string>>({});
  
  // Final results
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

  const performImageAnalysis = async () => {
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
      if (urls.length === 0) {
        throw new Error('Failed to upload images');
      }

      setProgress(40);

      // Analyze images with Gemini
      const { data, error } = await supabase.functions.invoke('gemini-image-analysis', {
        body: {
          imageUrls: urls,
          deviceCategory
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setProgress(100);
      setImageAnalysis(data.analysis);
      setCurrentStep(3); // Go to clarifying questions
      toast.success('Image analysis completed!');

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze images. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const skipClarifyingQuestions = () => {
    setCurrentStep(4); // Skip to description
    toast.info('Clarifying questions skipped');
  };

  const proceedToDescription = () => {
    setCurrentStep(4); // Go to description step
  };

  const generateDescriptionQuestions = async () => {
    if (!description.trim()) {
      toast.error('Please provide a description of the problem');
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-description-questions', {
        body: {
          description: description.trim(),
          deviceCategory,
          initialAnalysis: imageAnalysis
        }
      });

      if (error) throw error;

      setDescriptionQuestions(data.questions || []);
      setCurrentStep(5); // Go to description questions
      
      if (data.usedFallback) {
        toast.info('Using fallback questions');
      }

    } catch (error) {
      console.error('Question generation error:', error);
      // Use fallback questions
      setDescriptionQuestions([
        "What specific symptoms or behaviors are you observing?",
        "When did you first notice this issue occurring?",
        "Does the problem happen every time you use the device?",
        "Are there any error messages or warning indicators?",
        "What troubleshooting steps have you already tried?"
      ]);
      setCurrentStep(5);
      toast.info('Using fallback questions');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const skipDescriptionQuestions = () => {
    setCurrentStep(6); // Skip to final diagnosis
    toast.info('Description questions skipped');
  };

  const startFinalDiagnosis = async () => {
    setIsAnalyzing(true);
    setProgress(10);

    try {
      // Create diagnostic session
      const { data: sessionData, error: sessionError } = await supabase
        .from('diagnostic_sessions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // anonymous user
          image_urls: imageUrls,
          symptoms_text: description,
          device_category: deviceCategory,
          status: 'analyzing'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setProgress(40);

      // Comprehensive diagnosis
      const { data: diagnosisResult, error: diagnosisError } = await supabase.functions.invoke('comprehensive-diagnosis', {
        body: {
          sessionId: sessionData.id,
          imageAnalysis,
          description,
          clarifyingAnswers,
          descriptionAnswers,
          deviceCategory
        }
      });

      if (diagnosisError) throw diagnosisError;

      setProgress(100);

      // Set session with results
      setSession({
        id: sessionData.id,
        status: 'completed',
        aiAnalysis: diagnosisResult.diagnosis
      });

      setCurrentStep(7); // Show results
      toast.success('Diagnosis completed successfully!');

    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Diagnosis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setSelectedImages([]);
    setImageUrls([]);
    setDeviceCategory('');
    setImageAnalysis(null);
    setClarifyingAnswers({});
    setDescription('');
    setDescriptionQuestions([]);
    setDescriptionAnswers({});
    setSession(null);
    setProgress(0);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5, 6, 7].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            {step}
          </div>
          {step < 7 && (
            <div className={`
              w-8 h-1 mx-1
              ${currentStep > step ? 'bg-primary' : 'bg-muted'}
            `} />
          )}
        </div>
      ))}
    </div>
  );

  if (currentStep === 7 && session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <DiagnosticResults session={session} onStartNew={resetFlow} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {renderStepIndicator()}

      {/* Step 1: Image Upload */}
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

      {/* Step 2: Category Selection */}
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
                  <SelectItem value="instrument">Measurement Instrument</SelectItem>
                  <SelectItem value="component">Electronic Component</SelectItem>
                  <SelectItem value="pcb">PCB/Circuit Board</SelectItem>
                  <SelectItem value="board">Development Board</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={performImageAnalysis} 
                disabled={!deviceCategory || isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Start Analysis'
                )}
              </Button>
            </div>

            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  Gemini AI is analyzing your images...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Clarifying Questions */}
      {currentStep === 3 && imageAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Image Analysis Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What I observed:</h4>
              <p className="text-sm">{imageAnalysis.visualObservations}</p>
              
              <h4 className="font-semibold mt-3 mb-2">Likely problems:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {imageAnalysis.likelyProblems.map((problem, index) => (
                  <li key={index}>{problem}</li>
                ))}
              </ul>
              
              <p className="text-xs text-muted-foreground mt-2">
                Confidence: {imageAnalysis.confidence}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Clarifying Questions (Optional)</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipClarifyingQuestions}
                  className="text-xs"
                >
                  <SkipForward className="w-3 h-3 mr-1" />
                  Skip
                </Button>
              </div>
              
              <div className="space-y-3">
                {imageAnalysis.clarifyingQuestions.map((question, index) => (
                  <div key={index}>
                    <Label className="text-sm">{question}</Label>
                    <Textarea
                      value={clarifyingAnswers[question] || ''}
                      onChange={(e) => setClarifyingAnswers(prev => ({
                        ...prev,
                        [question]: e.target.value
                      }))}
                      placeholder="Your answer (optional)"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                Back
              </Button>
              <Button onClick={proceedToDescription} className="flex-1">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Description Input */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Problem Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">
                Describe the problem you're experiencing (Required)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the symptoms, when it started, what happens, etc. Be as detailed as possible..."
                className="mt-2 min-h-[100px]"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={generateDescriptionQuestions} 
                disabled={!description.trim() || isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? 'Generating Questions...' : 'Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Description-based Questions */}
      {currentStep === 5 && descriptionQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Additional Questions</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipDescriptionQuestions}
                className="text-xs"
              >
                <SkipForward className="w-3 h-3 mr-1" />
                Skip
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                📝 <strong>Note:</strong> Answering these questions helps provide a more accurate solution.
              </p>
            </div>

            <div className="space-y-3">
              {descriptionQuestions.map((question, index) => (
                <div key={index}>
                  <Label className="text-sm">{question}</Label>
                  <Textarea
                    value={descriptionAnswers[question] || ''}
                    onChange={(e) => setDescriptionAnswers(prev => ({
                      ...prev,
                      [question]: e.target.value
                    }))}
                    placeholder="Your answer (optional)"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(4)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setCurrentStep(6)} className="flex-1">
                Continue to Diagnosis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Final Diagnosis */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready for Diagnosis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Summary:</h4>
              <p className="text-sm mb-2"><strong>Device:</strong> {deviceCategory}</p>
              <p className="text-sm mb-2"><strong>Problem:</strong> {description}</p>
              <p className="text-sm mb-2">
                <strong>Questions answered:</strong> {
                  Object.values({...clarifyingAnswers, ...descriptionAnswers})
                    .filter(answer => answer && answer.trim()).length
                }
              </p>
              {imageAnalysis && (
                <p className="text-sm">
                  <strong>Likely issues:</strong> {imageAnalysis.likelyProblems.join(', ')}
                </p>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                🔍 I'll now search our database and use AI to provide you with the best repair solution.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(5)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={startFinalDiagnosis} 
                disabled={isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Diagnosing...
                  </>
                ) : (
                  'Get Diagnosis'
                )}
              </Button>
            </div>

            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  Searching database and analyzing with AI...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};