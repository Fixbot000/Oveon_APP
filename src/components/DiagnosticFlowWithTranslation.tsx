import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Bot, Wrench } from 'lucide-react';

interface DiagnosticFlowProps {
  selectedLanguage: string;
  canScan?: boolean;
  onScanComplete?: () => void;
}

interface DiagnosisData {
  problem: string;
  repairSteps: string[];
  toolsNeeded: string[];
  preventionTip: string;
}

const DiagnosticFlowWithTranslation: React.FC<DiagnosticFlowProps> = ({ 
  selectedLanguage, 
  canScan = true, 
  onScanComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1 & 2 state
  const [deviceName, setDeviceName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemFiles, setProblemFiles] = useState<FileList | null>(null);

  // Step 3 state
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});

  // Translation function
  const translateText = async (text: string): Promise<string> => {
    if (selectedLanguage === 'en') return text;
    
    try {
      const { data, error } = await supabase.functions.invoke('gemini-translate', {
        body: { text, targetLanguage: selectedLanguage }
      });
      
      if (error) throw error;
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text
    }
  };

  // Translated UI text state
  const [uiText, setUiText] = useState({
    deviceScannerTitle: 'Device Scanner',
    step1Title: 'Device Information',
    step2Title: 'Problem Description',
    step3Title: 'Clarifying Questions',
    step4Title: 'Diagnosis & Repair Guide',
    deviceNameLabel: 'Device Name',
    deviceNamePlaceholder: 'Enter device name (e.g., iPhone 12, Samsung TV)',
    photoLabel: 'Take or Upload Photo',
    photoDescription: 'Clear photos help provide better diagnosis',
    problemLabel: 'Describe the Problem',
    problemPlaceholder: 'Describe what\'s wrong with your device...',
    problemFileLabel: 'Upload Additional Files (Optional)',
    problemFileDescription: 'Code files, error logs, or additional images',
    nextButton: 'Next',
    analyzeButton: 'Analyze Problem',
    analyzing: 'Analyzing...',
    generateReportButton: 'Get Repair Guide',
    generatingReport: 'Generating Report...',
    dailyLimitReached: 'Daily Limit Reached',
    problemIdentified: 'Problem Identified',
    repairSteps: 'Detailed Repair Steps',
    toolsNeeded: 'Tools Needed',
    preventionTip: 'Prevention Tip',
    startNewDiagnosis: 'Start New Diagnosis',
    awaitingDiagnosis: 'Awaiting diagnosis...',
  });

  // Translate UI text when language changes
  useEffect(() => {
    const translateUI = async () => {
      if (selectedLanguage === 'en') return;

      try {
        const translations = await Promise.all([
          translateText('Device Scanner'),
          translateText('Device Information'),
          translateText('Problem Description'),
          translateText('Clarifying Questions'),
          translateText('Diagnosis & Repair Guide'),
          translateText('Device Name'),
          translateText('Enter device name (e.g., iPhone 12, Samsung TV)'),
          translateText('Take or Upload Photo'),
          translateText('Clear photos help provide better diagnosis'),
          translateText('Describe the Problem'),
          translateText('Describe what\'s wrong with your device...'),
          translateText('Upload Additional Files (Optional)'),
          translateText('Code files, error logs, or additional images'),
          translateText('Next'),
          translateText('Analyze Problem'),
          translateText('Analyzing...'),
          translateText('Get Repair Guide'),
          translateText('Generating Report...'),
          translateText('Daily Limit Reached'),
          translateText('Problem Identified'),
          translateText('Detailed Repair Steps'),
          translateText('Tools Needed'),
          translateText('Prevention Tip'),
          translateText('Start New Diagnosis'),
          translateText('Awaiting diagnosis...'),
        ]);

        setUiText({
          deviceScannerTitle: translations[0],
          step1Title: translations[1],
          step2Title: translations[2],
          step3Title: translations[3],
          step4Title: translations[4],
          deviceNameLabel: translations[5],
          deviceNamePlaceholder: translations[6],
          photoLabel: translations[7],
          photoDescription: translations[8],
          problemLabel: translations[9],
          problemPlaceholder: translations[10],
          problemFileLabel: translations[11],
          problemFileDescription: translations[12],
          nextButton: translations[13],
          analyzeButton: translations[14],
          analyzing: translations[15],
          generateReportButton: translations[16],
          generatingReport: translations[17],
          dailyLimitReached: translations[18],
          problemIdentified: translations[19],
          repairSteps: translations[20],
          toolsNeeded: translations[21],
          preventionTip: translations[22],
          startNewDiagnosis: translations[23],
          awaitingDiagnosis: translations[24],
        });
      } catch (error) {
        console.error('UI translation error:', error);
      }
    };

    translateUI();
  }, [selectedLanguage]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProblemFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProblemFiles(event.target.files);
  };

  const analyzeCodeProblem = async () => {
    if (!problemDescription.trim()) {
      toast.error('Please provide a problem description');
      return;
    }

    setLoading(true);
    try {
      let fileContents = '';
      
      if (problemFiles) {
        for (let i = 0; i < problemFiles.length; i++) {
          const file = problemFiles[i];
          const text = await file.text();
          fileContents += `\n\n--- ${file.name} ---\n${text}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('analyze-code-problem', {
        body: {
          description: problemDescription,
          files: fileContents,
          language: selectedLanguage
        }
      });

      if (error) throw error;

      // Translate questions if needed
      const translatedQuestions = selectedLanguage === 'en' 
        ? data.questions 
        : await Promise.all(data.questions.map((q: string) => translateText(q)));

      setQuestions(translatedQuestions);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error analyzing problem:', error);
      toast.error('Failed to analyze problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Next = () => {
    if (!deviceName.trim()) {
      toast.error('Please enter device name');
      return;
    }
    if (!photo) {
      toast.error('Please take or upload a photo');
      return;
    }
    setCurrentStep(2);
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setDeviceName('');
    setPhoto(null);
    setPhotoPreview('');
    setProblemDescription('');
    setProblemFiles(null);
    setQuestions([]);
    setAnswers({});
  };

  const progressValue = (currentStep / 4) * 100;

  return (
    <div className="space-y-6">
      <Progress value={progressValue} className="w-full" />
      
      {/* Step 1: Device Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {uiText.step1Title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{uiText.deviceNameLabel}</label>
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={uiText.deviceNamePlaceholder}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{uiText.photoLabel}</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="max-w-full h-48 mx-auto object-contain rounded" />
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{uiText.photoDescription}</p>
                    </div>
                  )}
                </div>
              </label>
            </div>
            
            <Button onClick={handleStep1Next} className="w-full">
              {uiText.nextButton}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Problem Description */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {uiText.step2Title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{uiText.problemLabel}</label>
              <Textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder={uiText.problemPlaceholder}
                rows={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{uiText.problemFileLabel}</label>
              <input
                type="file"
                multiple
                onChange={handleProblemFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-xs text-muted-foreground mt-1">{uiText.problemFileDescription}</p>
            </div>
            
            <Button 
              onClick={analyzeCodeProblem} 
              disabled={loading || !canScan}
              className="w-full"
            >
              {loading ? uiText.analyzing : !canScan ? uiText.dailyLimitReached : uiText.analyzeButton}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Clarifying Questions */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {uiText.step3Title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question, index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-2">
                  {index + 1}. {question}
                </label>
                <Textarea
                  value={answers[index] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                  placeholder={`Answer ${index + 1}...`}
                  rows={2}
                />
              </div>
            ))}
            
            <Button 
              onClick={async () => {
                setLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke('gemini-generate-report', {
                    body: {
                      deviceName,
                      problemDescription,
                      questions,
                      answers: Object.values(answers),
                      language: selectedLanguage
                    }
                  });

                  if (error) throw error;

                  // Call onScanComplete callback to update scan count
                  if (onScanComplete) {
                    onScanComplete();
                  }

                  // Navigate to results page
                  navigate('/diagnosis-result', { 
                    state: { 
                      diagnosis: data,
                      language: selectedLanguage,
                      uiText
                    } 
                  });
                } catch (error) {
                  console.error('Error generating final report:', error);
                  toast.error('Failed to generate repair guide. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !canScan}
              className="w-full"
            >
              {loading ? uiText.generatingReport : !canScan ? uiText.dailyLimitReached : uiText.generateReportButton}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiagnosticFlowWithTranslation;