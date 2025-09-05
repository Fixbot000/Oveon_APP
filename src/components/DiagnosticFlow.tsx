import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Upload, Camera, AlertCircle, Wrench, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTranslation } from '@/lib/translations';

interface AnalysisResult {
  nameAnalysis: {
    commonProblems: string[];
    deviceCategory: string;
  };
  photoAnalysis: {
    visibleDamage: string[];
    missingConnections: string[];
    condition: string;
  };
  descriptionAnalysis: {
    symptoms: string[];
    severity: string;
  };
}

interface Question {
  id: string;
  question: string;
  category: string;
}

interface FinalReport {
  problem: string;
  detailedRepairSteps: string[];
  safetyTips: string[];
}

interface DiagnosticFlowProps {
  selectedLanguage: string;
}

export default function DiagnosticFlow({ selectedLanguage }: DiagnosticFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1 data
  const [deviceName, setDeviceName] = useState('');
  const [devicePhoto, setDevicePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Step 2 data
  const [userDescription, setUserDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Step 3 data
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Step 4 data
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDevicePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep1Submit = () => {
    if (!deviceName.trim() || !devicePhoto) {
      toast.error("Please provide both device name and photo");
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Submit = async () => {
    if (!userDescription.trim()) {
      toast.error("Please provide a description of the issue");
      return;
    }

    setLoading(true);
    try {
      // Convert photo to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(devicePhoto!);
      });

      const { data, error } = await supabase.functions.invoke('analyze-and-generate-questions', {
        body: {
          deviceName,
          imageBase64: base64.split(',')[1],
          description: userDescription,
          language: selectedLanguage
        }
      });

      if (error) throw error;
      
      setAnalysisResult(data.analysis);
      setQuestions(data.questions);
      setCurrentStep(3);
    } catch (error) {
      console.error('Step 2 analysis error:', error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-final-diagnosis', {
        body: {
          deviceName,
          analysis: analysisResult,
          questions,
          answers,
          language: selectedLanguage
        }
      });

      if (error) throw error;
      
      setFinalReport(data);
      setCurrentStep(4);
    } catch (error) {
      console.error('Final diagnosis error:', error);
      toast.error("Failed to generate diagnosis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetDiagnostic = () => {
    setCurrentStep(1);
    setDeviceName('');
    setDevicePhoto(null);
    setPhotoPreview(null);
    setUserDescription('');
    setAnalysisResult(null);
    setQuestions([]);
    setAnswers({});
    setFinalReport(null);
  };

  const getStepTitle = (step: number) => {
    const titles = [
      '',
      'Device Information',
      'Issue Description & Analysis',
      'Clarification Questions',
      'Diagnosis & Repair Guide'
    ];
    return titles[step] || '';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of 4</span>
          <span>{Math.round((currentStep / 4) * 100)}%</span>
        </div>
        <Progress value={(currentStep / 4) * 100} className="h-2" />
      </div>

      {/* Step 1: Device Name and Photo */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {getStepTitle(1)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Enter your device name (e.g., iPhone 12, Samsung TV)"
              />
            </div>
            
            <div>
              <Label htmlFor="devicePhoto">Device Photo</Label>
              <Input
                id="devicePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
              />
              {photoPreview && (
                <img 
                  src={photoPreview} 
                  alt="Device preview" 
                  className="mt-2 max-w-full h-48 object-cover rounded-lg"
                />
              )}
            </div>

            <Button 
              onClick={handleStep1Submit}
              disabled={!deviceName.trim() || !devicePhoto}
              className="w-full"
            >
              Continue to Description
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Description and Analysis */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {getStepTitle(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Describe the Issue</Label>
              <Textarea
                id="description"
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder="Describe what's wrong with your device, when it started, what you were doing when it happened, etc."
                rows={4}
              />
            </div>

            {analysisResult && (
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h4 className="font-semibold">Analysis Results</h4>
                
                <div>
                  <p><strong>Device Category:</strong> {analysisResult.nameAnalysis.deviceCategory}</p>
                  <p><strong>Common Problems:</strong></p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysisResult.nameAnalysis.commonProblems.map((problem, index) => (
                      <Badge key={index} variant="secondary">{problem}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p><strong>Photo Analysis:</strong> {analysisResult.photoAnalysis.condition}</p>
                  {analysisResult.photoAnalysis.visibleDamage.length > 0 && (
                    <>
                      <p><strong>Visible Damage:</strong></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.photoAnalysis.visibleDamage.map((damage, index) => (
                          <Badge key={index} variant="destructive">{damage}</Badge>
                        ))}
                      </div>
                    </>
                  )}
                  {analysisResult.photoAnalysis.missingConnections.length > 0 && (
                    <>
                      <p><strong>Missing/Loose Connections:</strong></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.photoAnalysis.missingConnections.map((connection, index) => (
                          <Badge key={index} variant="outline">{connection}</Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <p><strong>Symptoms Identified:</strong></p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysisResult.descriptionAnalysis.symptoms.map((symptom, index) => (
                      <Badge key={index} variant="default">{symptom}</Badge>
                    ))}
                  </div>
                  <p><strong>Severity:</strong> {analysisResult.descriptionAnalysis.severity}</p>
                </div>
              </div>
            )}

            <Button 
              onClick={handleStep2Submit}
              disabled={loading || !userDescription.trim()}
              className="w-full"
            >
              {loading ? 'Analyzing...' : 'Analyze & Generate Questions'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Clarification Questions */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {getStepTitle(3)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Please answer these questions to help us identify the exact problem. You can skip questions if not applicable.
              </p>
            </div>

            {questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  <Badge variant="outline" className="mr-2">{question.category}</Badge>
                  {question.question}
                </Label>
                <Textarea
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers(prev => ({
                    ...prev,
                    [question.id]: e.target.value
                  }))}
                  placeholder="Your answer (optional)"
                  rows={2}
                />
              </div>
            ))}

            <Button 
              onClick={handleStep3Submit}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating Diagnosis...' : 'Get Final Diagnosis'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Final Diagnosis and Repair Guide */}
      {currentStep === 4 && finalReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {getStepTitle(4)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problem Identification */}
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Problem Identified
              </h4>
              <p className="text-red-700 dark:text-red-300">{finalReport.problem}</p>
            </div>

            {/* Safety Tips */}
            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Safety Tips
              </h4>
              <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                {finalReport.safetyTips.map((tip, index) => (
                  <li key={index} className="flex gap-2">
                    <span>•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Repair Steps */}
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Detailed Repair Steps
              </h4>
              <ol className="text-green-700 dark:text-green-300 space-y-2">
                {finalReport.detailedRepairSteps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-semibold">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Button 
              onClick={resetDiagnostic}
              variant="outline"
              className="w-full"
            >
              Start New Diagnosis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}