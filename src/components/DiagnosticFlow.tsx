import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: string;
  question: string;
  answer?: string;
}

interface StepData {
  imageAnalysis?: string;
  questions1?: Question[];
  description?: string;
  descriptionAnalysis?: string;
  questions2?: Question[];
  finalSolution?: string;
}

const DiagnosticFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stepData, setStepData] = useState<StepData>({});
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const steps = [
    { number: 1, title: 'Upload Image', description: 'Take or upload a photo of the device' },
    { number: 2, title: 'AI Analysis', description: 'AI analyzes the image for issues' },
    { number: 3, title: 'Questions', description: 'Answer questions to help diagnosis (optional)' },
    { number: 4, title: 'Description', description: 'Describe the problem in detail' },
    { number: 5, title: 'Final Questions', description: 'Additional clarifying questions (optional)' },
    { number: 6, title: 'Solution', description: 'Get detailed repair instructions' }
  ];

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage(base64);
      
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('gemini-analyze-image', {
          body: { imageBase64: base64 }
        });

        if (error) throw error;

        setStepData(prev => ({
          ...prev,
          imageAnalysis: data.analysis,
          questions1: data.questions.map((q: string, i: number) => ({ id: `q1_${i}`, question: q }))
        }));
        setCurrentStep(3);
      } catch (error) {
        console.error('Error analyzing image:', error);
        toast({
          title: "Analysis Error",
          description: "Failed to analyze the image. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuestionAnswer = (questionId: string, answer: string, questionSet: 'questions1' | 'questions2') => {
    setStepData(prev => ({
      ...prev,
      [questionSet]: prev[questionSet]?.map(q => 
        q.id === questionId ? { ...q, answer } : q
      )
    }));
  };

  const handleDescriptionSubmit = async () => {
    if (!stepData.description?.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe the problem before continuing.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const answers1 = stepData.questions1?.reduce((acc, q) => {
        if (q.answer) acc[q.question] = q.answer;
        return acc;
      }, {} as Record<string, string>) || {};

      const { data, error } = await supabase.functions.invoke('gemini-analyze-description', {
        body: {
          description: stepData.description,
          previousAnalysis: stepData.imageAnalysis,
          questionAnswers: answers1
        }
      });

      if (error) throw error;

      setStepData(prev => ({
        ...prev,
        descriptionAnalysis: data.analysis,
        questions2: data.questions.map((q: string, i: number) => ({ id: `q2_${i}`, question: q }))
      }));
      setCurrentStep(5);
    } catch (error) {
      console.error('Error analyzing description:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze the description. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalDiagnosis = async () => {
    setLoading(true);
    try {
      const allAnswers = {
        questions1: stepData.questions1?.reduce((acc, q) => {
          if (q.answer) acc[q.question] = q.answer;
          return acc;
        }, {} as Record<string, string>) || {},
        questions2: stepData.questions2?.reduce((acc, q) => {
          if (q.answer) acc[q.question] = q.answer;
          return acc;
        }, {} as Record<string, string>) || {},
        description: stepData.description
      };

      const { data, error } = await supabase.functions.invoke('gemini-web-search-solution', {
        body: {
          finalAnalysis: stepData.descriptionAnalysis || stepData.imageAnalysis,
          allAnswers,
          deviceType: 'electronic device'
        }
      });

      if (error) throw error;

      setStepData(prev => ({ ...prev, finalSolution: data.solution }));
      setCurrentStep(6);
    } catch (error) {
      console.error('Error getting final solution:', error);
      toast({
        title: "Solution Error",
        description: "Failed to get repair solution. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {steps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 6 && <CheckCircle className="h-5 w-5 text-green-500" />}
            {steps[currentStep - 1]?.title}
          </CardTitle>
          <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-border hover:border-primary"
                variant="outline"
                disabled={loading}
              >
                <div className="text-center">
                  {loading ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                  )}
                  <p>{loading ? 'Analyzing...' : 'Upload Image'}</p>
                </div>
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 mx-auto animate-spin" />
              <p>AI is analyzing your image...</p>
            </div>
          )}

          {currentStep === 3 && stepData.questions1 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Initial Analysis:</h4>
                <p className="text-sm">{stepData.imageAnalysis}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Help us understand better (optional):</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center gap-1"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
                {stepData.questions1.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label>{q.question}</Label>
                    <Textarea
                      value={q.answer || ''}
                      onChange={(e) => handleQuestionAnswer(q.id, e.target.value, 'questions1')}
                      placeholder="Your answer (optional)"
                      rows={2}
                    />
                  </div>
                ))}
                <Button onClick={() => setCurrentStep(4)} className="w-full">
                  Continue to Description
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Describe the problem in detail *</Label>
                <Textarea
                  id="description"
                  value={stepData.description || ''}
                  onChange={(e) => setStepData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Please describe what's wrong with your device, when it started, any symptoms you've noticed..."
                  rows={4}
                  required
                />
              </div>
              <Button 
                onClick={handleDescriptionSubmit} 
                disabled={loading || !stepData.description?.trim()}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Analyze Description
              </Button>
            </div>
          )}

          {currentStep === 5 && stepData.questions2 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Updated Analysis:</h4>
                <p className="text-sm">{stepData.descriptionAnalysis}</p>
              </div>

              {stepData.questions2.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Final clarifications (optional):</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleFinalDiagnosis}
                      className="flex items-center gap-1"
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip to Solution
                    </Button>
                  </div>
                  {stepData.questions2.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <Label>{q.question}</Label>
                      <Textarea
                        value={q.answer || ''}
                        onChange={(e) => handleQuestionAnswer(q.id, e.target.value, 'questions2')}
                        placeholder="Your answer (optional)"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button onClick={handleFinalDiagnosis} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Get Repair Solution
                  </Button>
                </div>
              ) : (
                <Button onClick={handleFinalDiagnosis} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Get Repair Solution
                </Button>
              )}
            </div>
          )}

          {currentStep === 6 && stepData.finalSolution && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  Repair Solution Found
                </h4>
                <div className="prose prose-sm max-w-none text-green-700 dark:text-green-300">
                  <pre className="whitespace-pre-wrap font-sans">{stepData.finalSolution}</pre>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setCurrentStep(1);
                  setStepData({});
                  setUploadedImage(null);
                }}
                variant="outline"
                className="w-full"
              >
                Start New Diagnosis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uploaded Image</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={uploadedImage} 
              alt="Uploaded device" 
              className="w-full h-48 object-cover rounded-lg"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiagnosticFlow;