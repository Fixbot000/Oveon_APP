import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, FileText, HelpCircle, Wrench, AlertTriangle, Shield, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEnhancedScan } from '@/hooks/useEnhancedScan';
import { isNativePlatform } from '@/utils/capacitorHelpers';

interface DiagnosticFlowProps {
  selectedLanguage: string;
  canScan?: boolean;
  onScanComplete?: () => void;
}

export default function DiagnosticFlow({ selectedLanguage, canScan = true, onScanComplete }: DiagnosticFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    loading, 
    captureImage, 
    analyzeCode, 
    analyzeDevice, 
    generateDiagnosis 
  } = useEnhancedScan();

  // Step 1: Device name and photo
  const [deviceName, setDeviceName] = useState('');
  const [devicePhoto, setDevicePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [codeAnalysisResult, setCodeAnalysisResult] = useState<{
    problems: string[];
    suggestions: string[];
    correctedCode?: string;
  } | null>(null);
  const [showCodeSolutions, setShowCodeSolutions] = useState(false);
  
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

  const handlePhotoChange = async (event?: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (isNativePlatform()) {
        // Use Capacitor Camera for native platforms
        const imageData = await captureImage();
        setPhotoPreview(imageData);
        // Convert data URL to blob for file compatibility
        const response = await fetch(imageData);
        const blob = await response.blob();
        const file = new File([blob], 'camera-image.jpg', { type: 'image/jpeg' });
        setDevicePhoto(file);
      } else {
        // Use file input for web
        const file = event?.target.files?.[0];
        if (file) {
          setDevicePhoto(file);
          const reader = new FileReader();
          reader.onload = (e) => setPhotoPreview(e.target?.result as string);
          reader.readAsDataURL(file);
        }
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      toast.error('Failed to capture photo. Please check camera permissions.');
    }
  };

  const handleProblemFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const supportedTypes = ['.txt', '.c', '.cpp', '.py', '.ino', '.json', '.xml', '.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!supportedTypes.includes(fileExtension)) {
        toast.error('Unsupported file format. Supported: .txt, .c, .cpp, .py, .ino, .json, .xml, .pdf');
        return;
      }
      
      setProblemFile(file);
    }
  };

  const analyzeCodeProblem = async () => {
    if (!canScan) {
      toast.error('Daily scan limit reached. Upgrade to Premium for unlimited scans.');
      return;
    }

    try {
      let fileContent = '';
      let fileName = '';

      if (problemFile) {
        fileName = problemFile.name;
        if (problemFile.name.endsWith('.pdf')) {
          // For PDF files, we'll just use the filename
          fileContent = `PDF file: ${problemFile.name}`;
        } else {
          // For text-based files, read the content
          fileContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsText(problemFile);
          });
        }
      }

      const result = await analyzeCode(
        problemDescription,
        fileContent || undefined,
        fileName || undefined
      );

      setCodeAnalysisResult(result);
      
      // Call onScanComplete callback to update scan count
      if (onScanComplete) {
        onScanComplete();
      }
    } catch (error) {
      // Error handling is done in the hook
      console.error('Code analysis failed:', error);
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
    setProblemDescription('');
    setProblemFile(null);
    setCodeAnalysisResult(null);
    setShowCodeSolutions(false);
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
                placeholder="e.g., Samsung TV"
              />
            </div>
            
            <div>
              <Label htmlFor="devicePhoto">Device Photo</Label>
              {isNativePlatform() ? (
                <Button
                  type="button"
                  onClick={() => handlePhotoChange()}
                  className="w-full h-10 justify-start"
                  variant="outline"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {devicePhoto ? 'Photo Captured' : 'Take Photo'}
                </Button>
              ) : (
                <>
                  <label htmlFor="devicePhotoInput" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer items-center">
                    <Camera className="w-4 h-4 mr-2" />
                    {devicePhoto ? devicePhoto.name : "Upload Photo"}
                  </label>
                  <Input
                    id="devicePhotoInput"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
            
            {photoPreview && (
                <img 
                  src={photoPreview} 
                  alt="Device" 
                  className="mt-2 max-w-full h-48 object-cover rounded-lg"
                />
              )}

            <Button 
              onClick={handleStep1Next}
              disabled={!deviceName.trim() || !devicePhoto || !canScan}
              className="w-full"
            >
              {!canScan ? 'Daily Limit Reached' : 'Next Step'}
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
                if (!canScan) {
                  toast.error('Daily scan limit reached. Upgrade to Premium for unlimited scans.');
                  return;
                }
                
                try {
                  let imageData: string;
                  
                  if (photoPreview) {
                    // Use existing preview data
                    imageData = photoPreview;
                  } else if (devicePhoto) {
                    // Read file as data URL
                    imageData = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(devicePhoto);
                    });
                  } else {
                    toast.error('Please capture a device photo first.');
                    return;
                  }

                  const result = await analyzeDevice(
                    deviceName,
                    imageData,
                    description,
                    selectedLanguage
                  );
                  
                  setQuestions(result.questions);
                  setCurrentStep(3);
                } catch (error) {
                  // Error handling is done in the hook
                  console.error('Device analysis failed:', error);
                }
              }}
              disabled={loading || !description.trim() || !devicePhoto || !canScan}
              className="w-full"
            >
              {loading ? 'Analyzing...' : !canScan ? 'Daily Limit Reached' : 'Analyze & Generate Questions'}
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
                if (!canScan) {
                  toast.error('Daily scan limit reached. Upgrade to Premium for unlimited scans.');
                  return;
                }
                
                try {
                  const result = await generateDiagnosis(
                    deviceName,
                    description,
                    questions,
                    answers,
                    selectedLanguage
                  );

                  // Call onScanComplete callback to update scan count
                  if (onScanComplete) {
                    onScanComplete();
                  }

                  setFinalDiagnosis(result);
                  navigate('/diagnosis-result', { state: { finalDiagnosis: result } });
                  setCurrentStep(4);
                } catch (error) {
                  // Error handling is done in the hook
                  console.error('Diagnosis generation failed:', error);
                }
              }}
              disabled={loading || !canScan}
              className="w-full"
            >
              {loading ? 'Generating Report...' : !canScan ? 'Daily Limit Reached' : 'Get Repair Guide'}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}