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
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface DiagnosticFlowProps {
  selectedLanguage: string;
}

export default function DiagnosticFlow({ selectedLanguage }: DiagnosticFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step 1: Device name and photo
  const [deviceName, setDeviceName] = useState('');
  const [devicePhoto, setDevicePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Step 2: Description
  const [description, setDescription] = useState('');
  // New pipeline state
  const [questions, setQuestions] = useState<{ id: string, category: string, question: string }[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [finalDiagnosis, setFinalDiagnosis] = useState<{ 
    problem: string; 
    repairSteps: string[]; 
    toolsNeeded: string[]; 
    preventionTip: string; 
  } | null>(null);

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

  const resetFlow = () => {
    setCurrentStep(1);
    setDeviceName('');
    setDevicePhoto(null);
    setPhotoPreview(null);
    setDescription('');
    setQuestions([]);
    setAnswers({});
    setFinalDiagnosis(null);
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
              onClick={async () => {
                if (!description.trim()) {
                  toast.error('Please provide a description.');
                  return;
                }
                setLoading(true);
                try {
                  const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(devicePhoto!); // devicePhoto is guaranteed to be File | null, but we check for null in handleStep1Next, so it's safe to assert here
                  });
                  const { data, error } = await supabase.functions.invoke('analyze-device-and-generate-questions', {
                    body: {
                      deviceName,
                      imageBase64: base64.split(',')[1],
                      description,
                      language: selectedLanguage,
                    },
                  });
                  if (error) throw error;
                  setQuestions(data.questions);
                  setCurrentStep(3);
                } catch (error) {
                  console.error('Error generating questions:', error);
                  toast.error('Failed to generate questions. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !description.trim() || !devicePhoto}
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

            {questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {question.category}
                  </Badge>
                </div>
                <Label htmlFor={`question-${question.id}`} className="text-sm font-medium">
                  {question.question}
                </Label>
                <Textarea
                  id={`question-${question.id}`}
                  value={answers[question.id] || ''}
                  onChange={(e) => {
                    setAnswers(prev => ({
                      ...prev,
                      [question.id]: e.target.value
                    }));
                  }}
                  placeholder="Your answer (optional)"
                  rows={2}
                  className="w-full"
                />
              </div>
            ))}

            <Button 
              onClick={async () => {
                setLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke('generate-repair-diagnosis', {
                    body: {
                      deviceName,
                      description,
                      questions,
                      answers,
                      language: selectedLanguage,
                    },
                  });
                  if (error) throw error;
                  
                  // Save to scans table for history
                  console.log('Saving scan for user:', user?.id);
                  const formatDiagnosisForHistory = (diagnosis: any) => {
                    return `Device: ${deviceName}\n\n` +
                           `Problem: ${diagnosis.problem}\n\n` +
                           `Repair Steps:\n${diagnosis.repairSteps}\n\n` +
                           `Tools Needed: ${diagnosis.toolsNeeded}\n\n` +
                           `Prevention Tip: ${diagnosis.preventionTip}`;
                  };

                  const scanToSave = {
                    user_id: user?.id,
                    device_name: deviceName,
                    result: formatDiagnosisForHistory(data)
                  };
                  console.log('Scan data to save:', scanToSave);

                  const { error: saveError } = await supabase
                    .from('scans')
                    .insert(scanToSave);

                  if (saveError) {
                    console.error('Error saving scan to history:', saveError);
                  }

                  setFinalDiagnosis(data);
                  navigate('/diagnosis-result', { state: { finalDiagnosis: data } });
                  setCurrentStep(4);
                } catch (error) {
                  console.error('Error generating final report:', error);
                  toast.error('Failed to generate repair guide. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating Report...' : 'Get Repair Guide'}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}