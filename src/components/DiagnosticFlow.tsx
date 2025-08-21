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
import { Upload, Camera, CheckCircle, Clock, Info, SkipForward, AlertCircle } from 'lucide-react';
import { DiagnosticResults } from './DiagnosticResults';

interface DiagnosticSession {
  id: string;
  status: 'analyzing' | 'completed' | 'failed';
  aiAnalysis?: any;
}

interface ImageAnalysis {
  possibleProblems: string[];
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
    setProgress(20);

    try {
      // Upload images first
      const urls = await uploadImages();
      if (urls.length === 0) {
        throw new Error('Failed to upload images');
      }

      setProgress(60);

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
      
      if (data.usedFallback) {
        toast.info('Image analysis completed with fallback');
      } else {
        toast.success('Image analysis completed successfully!');
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Image analysis failed. Please try again.');
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
      const { data, error } = await supabase.functions.invoke('gemini-description-analysis', {
        body: {
          description: description.trim(),
          deviceCategory,
          imageAnalysis
        }
      });

      if (error) throw error;

      setDescriptionQuestions(data.questions || []);
      setCurrentStep(5); // Go to description questions
      
      if (data.usedFallback) {
        toast.info('Using fallback questions');
      } else {
        toast.success('Description questions generated');
      }

    } catch (error) {
      console.error('Question generation error:', error);
      // Use fallback questions
      setDescriptionQuestions([
        "What specific symptoms are you experiencing?",
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

      setProgress(30);

      // Final diagnosis with fallback chain
      const { data: diagnosisResult, error: diagnosisError } = await supabase.functions.invoke('final-diagnosis', {
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
        aiAnalysis: {
          diagnosis: diagnosisResult.diagnosis,
          source: diagnosisResult.source
        }
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
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4, 5, 6, 7].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2
            ${currentStep >= step 
              ? 'bg-primary border-primary text-primary-foreground' 
              : 'bg-background border-muted-foreground text-muted-foreground'
            }
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
              <Label htmlFor="images">Select up to 5 clear images of your device</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelection}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Take clear photos showing the issue, device labels, and overall condition
              </p>
            </div>
            
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {selectedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
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
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Start AI Analysis
                  </>
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
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold mb-2 text-green-800">What I observed:</h4>
              <p className="text-sm text-green-700 mb-3">{imageAnalysis.visualObservations}</p>
              
              <h4 className="font-semibold mb-2 text-green-800">Possible problems:</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-green-700">
                {imageAnalysis.possibleProblems.map((problem, index) => (
                  <li key={index}>{problem}</li>
                ))}
              </ul>
              
              <p className="text-xs text-green-600 mt-3">
                AI Confidence: {imageAnalysis.confidence}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Clarifying Questions <span className="text-sm font-normal text-muted-foreground">(Optional)</span></h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipClarifyingQuestions}
                  className="text-xs"
                >
                  <SkipForward className="w-3 h-3 mr-1" />
                  Skip All
                </Button>
              </div>
              
              <div className="space-y-3">
                {imageAnalysis.clarifyingQuestions.map((question, index) => (
                  <div key={index}>
                    <Label className="text-sm font-medium">{question}</Label>
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

      {/* Step 4: Description Input (Required) */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Problem Description <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                📝 <strong>Required Step:</strong> Please describe your device problem in detail. 
                This helps the AI provide more accurate diagnosis and solutions.
              </p>
            </div>

            <div>
              <Label htmlFor="description">
                Describe the problem you're experiencing
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe:
• What symptoms you're seeing
• When the problem started  
• What happens when you try to use the device
• Any error messages or unusual behavior
• What you were doing when it started

Don't worry about typos or perfect grammar - just describe the issue clearly."
                className="mt-2 min-h-[120px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                The more details you provide, the better the diagnosis will be.
              </p>
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
                {isAnalyzing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Continue'
                )}
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
              <span>Follow-up Questions</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipDescriptionQuestions}
                className="text-xs"
              >
                <SkipForward className="w-3 h-3 mr-1" />
                Skip All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                🎯 <strong>Note:</strong> Answering these questions helps provide a more accurate solution.
              </p>
            </div>

            <div className="space-y-3">
              {descriptionQuestions.map((question, index) => (
                <div key={index}>
                  <Label className="text-sm font-medium">{question}</Label>
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
            <CardTitle>Ready for AI Diagnosis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Summary:</h4>
              <p className="text-sm mb-2"><strong>Device:</strong> {deviceCategory}</p>
              <p className="text-sm mb-2"><strong>Problem:</strong> {description.substring(0, 100)}...</p>
              <p className="text-sm mb-2">
                <strong>Questions answered:</strong> {
                  Object.values({...clarifyingAnswers, ...descriptionAnswers})
                    .filter(answer => answer && answer.trim()).length
                }
              </p>
              {imageAnalysis && (
                <p className="text-sm">
                  <strong>AI identified issues:</strong> {imageAnalysis.possibleProblems.join(', ')}
                </p>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    AI Diagnosis Pipeline
                  </p>
                  <p className="text-xs text-blue-700">
                    I'll analyze your information with Gemini AI, check our repair database, 
                    and use web search if needed. You'll always get a diagnosis - never a failure.
                  </p>
                </div>
              </div>
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
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Get AI Diagnosis
                  </>
                )}
              </Button>
            </div>

            {isAnalyzing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  Running AI diagnosis with fallback chain...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};