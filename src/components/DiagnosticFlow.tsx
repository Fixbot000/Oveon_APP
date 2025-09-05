import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, FileText, HelpCircle, Wrench, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  category: string;
}

interface FinalDiagnosis {
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
  
  // Step 1: Device name and photo
  const [deviceName, setDeviceName] = useState('');
  const [devicePhoto, setDevicePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Step 2: Description
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Step 3: Question answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Step 4: Final diagnosis
  const [diagnosis, setDiagnosis] = useState<FinalDiagnosis | null>(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDevicePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleStep1Next = () => {
    if (!deviceName.trim() || !devicePhoto) {
      toast.error('Please provide both device name and photo');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Analysis = async () => {
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setLoading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(devicePhoto!);
      });

      const { data, error } = await supabase.functions.invoke('analyze-device-and-generate-questions', {
        body: {
          deviceName,
          imageBase64: base64.split(',')[1],
          description,
          language: selectedLanguage
        }
      });

      if (error) throw error;
      setQuestions(data.questions);
      setCurrentStep(3);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Diagnosis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-repair-diagnosis', {
        body: {
          deviceName,
          description,
          questions,
          answers,
          language: selectedLanguage
        }
      });

      if (error) throw error;
      setDiagnosis(data);
      setCurrentStep(4);
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Failed to generate diagnosis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setDeviceName('');
    setDevicePhoto(null);
    setPhotoPreview(null);
    setDescription('');
    setQuestions([]);
    setAnswers({});
    setDiagnosis(null);
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
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., iPhone 12, Samsung TV, Dell Laptop"
              />
            </div>
            
            <div>
              <Label htmlFor="devicePhoto">Device Photo</Label>
              <Input
                id="devicePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              {photoPreview && (
                <img 
                  src={photoPreview} 
                  alt="Device" 
                  className="mt-2 max-w-full h-48 object-cover rounded-lg"
                />
              )}
            </div>

            <Button 
              onClick={handleStep1Next}
              disabled={!deviceName.trim() || !devicePhoto}
              className="w-full"
            >
              Next Step
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Description and Analysis */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Describe the Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">What's wrong with your device?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem in detail: when it started, what happens, any error messages, etc."
                rows={5}
              />
            </div>

            <Button 
              onClick={handleStep2Analysis}
              disabled={loading || !description.trim()}
              className="w-full"
            >
              {loading ? 'Analyzing...' : 'Analyze & Generate Questions'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Clarifying Questions */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Answer These Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Please answer these questions to help identify the exact problem. Skip any that don't apply.
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
              onClick={handleStep3Diagnosis}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating Diagnosis...' : 'Get Repair Guide'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Final Diagnosis and Repair Guide */}
      {currentStep === 4 && diagnosis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Diagnosis & Repair Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problem */}
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Problem Identified
              </h4>
              <p className="text-red-700 dark:text-red-300">{diagnosis.problem}</p>
            </div>

            {/* Safety Tips */}
            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Safety Tips
              </h4>
              <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                {diagnosis.safetyTips.map((tip, index) => (
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
                {diagnosis.detailedRepairSteps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-semibold">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Button 
              onClick={resetFlow}
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