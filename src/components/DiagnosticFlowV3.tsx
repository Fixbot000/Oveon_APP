import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Camera, 
  Loader2, 
  Check, 
  AlertTriangle,
  Brain,
  Search,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DiagnosticResultsV3 } from './DiagnosticResultsV3';

interface Problem {
  label: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ImageAnalysis {
  problems: Problem[];
  visualObservations: string;
  clarifyingQuestions: string[];
}

interface DescriptionAnalysis {
  refinedProblems: Problem[];
  additionalQuestions: string[];
  keySymptoms: string[];
  analysisNotes: string;
}

interface DiagnosticSession {
  id: string;
  status: 'analyzing' | 'completed' | 'failed';
  imageAnalysis?: ImageAnalysis;
  descriptionAnalysis?: DescriptionAnalysis;
  finalDiagnosis?: any;
}

const DEVICE_CATEGORIES = [
  'Smartphone', 'Laptop', 'Desktop Computer', 'Tablet', 'Gaming Console',
  'Television', 'Monitor', 'Printer', 'Router', 'Camera', 'Other Electronic Device'
];

export const DiagnosticFlowV3: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'questions' | 'description' | 'descQuestions' | 'diagnosis' | 'results'>('upload');
  const [images, setImages] = useState<File[]>([]);
  const [deviceCategory, setDeviceCategory] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [descQuestionAnswers, setDescQuestionAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const uploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `diagnostic-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('device-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data } = supabase.storage
        .from('device-images')
        .getPublicUrl(filePath);

      if (data) {
        imageUrls.push(data.publicUrl);
      }
    }

    return imageUrls;
  }, []);

  const handleImageUpload = useCallback(async () => {
    if (images.length === 0 || !deviceCategory) {
      setError('Please select at least one image and device category');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // Upload images
      const imageUrls = await uploadImages(images);
      
      if (imageUrls.length === 0) {
        throw new Error('Failed to upload images');
      }

      // Analyze images with Gemini
      const { data, error } = await supabase.functions.invoke('gemini-image-analysis-v3', {
        body: { imageUrls, deviceCategory }
      });

      if (error) throw error;

      const newSession: DiagnosticSession = {
        id: Math.random().toString(36),
        status: 'analyzing',
        imageAnalysis: data.analysis
      };

      setSession(newSession);
      setQuestionAnswers(new Array(data.analysis.clarifyingQuestions.length).fill(''));
      setCurrentStep('questions');
    } catch (err) {
      console.error('Image analysis error:', err);
      setError('Failed to analyze images. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [images, deviceCategory, uploadImages]);

  const handleQuestionsSubmit = useCallback(() => {
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    setError('');
    setCurrentStep('description');
  }, [description]);

  const handleDescriptionSubmit = useCallback(async () => {
    if (!session?.imageAnalysis || !description.trim()) {
      setError('Missing required information');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // Analyze description with Gemini
      const { data, error } = await supabase.functions.invoke('gemini-description-analysis-v3', {
        body: { 
          description, 
          deviceCategory, 
          imageAnalysis: session.imageAnalysis 
        }
      });

      if (error) throw error;

      const updatedSession = {
        ...session,
        descriptionAnalysis: data.analysis
      };

      setSession(updatedSession);
      setDescQuestionAnswers(new Array(data.analysis.additionalQuestions.length).fill(''));
      setCurrentStep('descQuestions');
    } catch (err) {
      console.error('Description analysis error:', err);
      setError('Failed to analyze description. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [session, description, deviceCategory]);

  const handleFinalDiagnosis = useCallback(async () => {
    if (!session?.imageAnalysis) {
      setError('Missing analysis data');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // Combine all problems for final diagnosis
      const allProblems = [
        ...(session.imageAnalysis.problems || []),
        ...(session.descriptionAnalysis?.refinedProblems || [])
      ];

      // Get final diagnosis through web search
      const { data, error } = await supabase.functions.invoke('web-search-diagnosis-v3', {
        body: { 
          problems: allProblems,
          description,
          deviceCategory,
          questionAnswers: [...questionAnswers, ...descQuestionAnswers]
        }
      });

      if (error) throw error;

      const finalSession = {
        ...session,
        status: 'completed' as const,
        finalDiagnosis: data
      };

      setSession(finalSession);
      setCurrentStep('results');
    } catch (err) {
      console.error('Final diagnosis error:', err);
      setError('Failed to complete diagnosis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [session, description, deviceCategory, questionAnswers, descQuestionAnswers]);

  const startNewDiagnosis = useCallback(() => {
    setCurrentStep('upload');
    setImages([]);
    setDeviceCategory('');
    setSession(null);
    setQuestionAnswers([]);
    setDescription('');
    setDescQuestionAnswers([]);
    setError('');
  }, []);

  if (currentStep === 'results' && session) {
    return <DiagnosticResultsV3 session={session} onStartNew={startNewDiagnosis} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AI Diagnostic Scan v3</h1>
        <p className="text-muted-foreground">Upload images for expert AI analysis</p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Image Upload */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Upload Device Images
            </CardTitle>
            <CardDescription>
              Take clear photos of your device, focusing on any visible issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="device-category">Device Category</Label>
              <select 
                className="w-full mt-1 p-2 border rounded-md"
                value={deviceCategory}
                onChange={(e) => setDeviceCategory(e.target.value)}
              >
                <option value="">Select device type</option>
                {DEVICE_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="image-upload">Upload Images</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImages(Array.from(e.target.files || []))}
                className="mt-1"
              />
              {images.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {images.length} image(s) selected
                </p>
              )}
            </div>

            <Button 
              onClick={handleImageUpload}
              disabled={images.length === 0 || !deviceCategory || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Images...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Image-based Clarifying Questions */}
      {currentStep === 'questions' && session?.imageAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Clarifying Questions
            </CardTitle>
            <CardDescription>
              Based on image analysis. All questions are optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show identified problems */}
            <div>
              <Label className="text-base font-medium">Identified Problems:</Label>
              <div className="mt-2 space-y-2">
                {session.imageAnalysis.problems.map((problem, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{problem.label}</span>
                      <Badge variant={problem.confidence === 'high' ? 'default' : 'secondary'}>
                        {problem.confidence} confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{problem.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Description box - Required */}
            <div>
              <Label htmlFor="description" className="text-base font-medium">
                Describe the Problem <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what's wrong with your device, when it started, what you were doing..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>

            {/* Optional questions */}
            <div>
              <Label className="text-base font-medium">
                Optional Questions 
                <span className="text-sm text-muted-foreground ml-2">
                  (Answering helps provide more accurate solutions)
                </span>
              </Label>
              <div className="mt-2 space-y-3">
                {session.imageAnalysis.clarifyingQuestions.map((question, index) => (
                  <div key={index}>
                    <Label className="text-sm">{question}</Label>
                    <Input
                      placeholder="Optional answer..."
                      value={questionAnswers[index]}
                      onChange={(e) => {
                        const newAnswers = [...questionAnswers];
                        newAnswers[index] = e.target.value;
                        setQuestionAnswers(newAnswers);
                      }}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleQuestionsSubmit} className="w-full">
              Continue to Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Description Analysis */}
      {currentStep === 'description' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Analyzing Description...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>AI is analyzing your description...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Description-based Questions */}
      {currentStep === 'descQuestions' && session?.descriptionAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Additional Questions
            </CardTitle>
            <CardDescription>
              Based on your description. All questions are optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show refined problems */}
            <div>
              <Label className="text-base font-medium">Refined Analysis:</Label>
              <div className="mt-2 space-y-2">
                {session.descriptionAnalysis.refinedProblems.map((problem, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{problem.label}</span>
                      <Badge variant={problem.confidence === 'high' ? 'default' : 'secondary'}>
                        {problem.confidence} confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{problem.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">
                Additional Questions 
                <span className="text-sm text-muted-foreground ml-2">
                  (All optional - skip if not relevant)
                </span>
              </Label>
              <div className="mt-2 space-y-3">
                {session.descriptionAnalysis.additionalQuestions.map((question, index) => (
                  <div key={index}>
                    <Label className="text-sm">{question}</Label>
                    <Input
                      placeholder="Optional answer..."
                      value={descQuestionAnswers[index]}
                      onChange={(e) => {
                        const newAnswers = [...descQuestionAnswers];
                        newAnswers[index] = e.target.value;
                        setDescQuestionAnswers(newAnswers);
                      }}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Answering questions helps provide a more accurate solution.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleFinalDiagnosis} 
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Getting Final Diagnosis...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Get Final Diagnosis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};