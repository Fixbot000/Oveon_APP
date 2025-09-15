import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, FileText, HelpCircle, Wrench, AlertTriangle, Shield, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getScanTranslation } from '@/lib/scanTranslations';
import { useScanLanguage } from '@/hooks/useScanLanguage';

interface DiagnosticFlowProps {
  selectedLanguage: string;
  canScan?: boolean;
  onScanComplete?: () => void;
}

export default function DiagnosticFlow({ selectedLanguage, canScan = true, onScanComplete }: DiagnosticFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { translateToEnglish, translateFromEnglish } = useScanLanguage();

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

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDevicePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
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
    if (!problemDescription.trim() && !problemFile) {
      toast.error('Please provide either a description or upload a file.');
      return;
    }

    if (!canScan) {
      toast.error('Daily scan limit reached. Upgrade to Premium for unlimited scans.');
      return;
    }

    setLoading(true);
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

      const { data, error } = await supabase.functions.invoke('analyze-code-problem', {
        body: {
          text: problemDescription || undefined,
          fileContent: fileContent || undefined,
          fileName: fileName || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        setCodeAnalysisResult({
          problems: data.problems,
          suggestions: data.suggestions,
          correctedCode: data.correctedCode,
        });
        
        // Call onScanComplete callback to update scan count
        if (onScanComplete) {
          onScanComplete();
        }

        toast.success('Code analysis completed!');
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing code:', error);
      toast.error('Unable to analyze, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Next = () => {
    if (!deviceName.trim() || !devicePhoto) {
      toast.error(getScanTranslation(selectedLanguage, 'provideDeviceNameAndPhoto'));
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
          <span>{getScanTranslation(selectedLanguage, 'step')} {currentStep} {getScanTranslation(selectedLanguage, 'of')} 4</span>
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
              {getScanTranslation(selectedLanguage, 'deviceInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deviceName">{getScanTranslation(selectedLanguage, 'deviceName')}</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={getScanTranslation(selectedLanguage, 'deviceNamePlaceholder')}
              />
            </div>
            
            <div>
              <Label htmlFor="devicePhoto">{getScanTranslation(selectedLanguage, 'devicePhoto')}</Label>
              <label htmlFor="devicePhotoInput" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer items-center">
                {devicePhoto ? devicePhoto.name : getScanTranslation(selectedLanguage, 'uploadFile')}
              </label>
              <Input
                id="devicePhotoInput"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
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
              {!canScan ? getScanTranslation(selectedLanguage, 'dailyLimitReached') : getScanTranslation(selectedLanguage, 'nextStep')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Section: Problem with Code or Schematic */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Problem with Code or Schematic?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Textarea for description */}
            <div className="relative">
              <Textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Describe the issue with your schematic or code..."
                className="min-h-[120px] pr-12"
              />
              {/* Upload Button */}
              <input
                id="problemFile"
                type="file"
                accept=".txt,.c,.cpp,.py,.ino,.json,.xml,.pdf"
                onChange={handleProblemFileChange}
                className="hidden"
              />
              <label
                htmlFor="problemFile"
                className="absolute bottom-2 right-2 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 transition-colors flex items-center"
              >
                <Paperclip className="h-3 w-3" />
                Upload
              </label>
            </div>

            {problemFile && (
              <div className="text-sm text-muted-foreground">
                Selected file: {problemFile.name}
              </div>
            )}

            <Button 
              onClick={analyzeCodeProblem}
              disabled={loading || (!problemDescription.trim() && !problemFile) || !canScan}
              className="w-full"
            >
              {loading ? 'Analyzing...' : !canScan ? getScanTranslation(selectedLanguage, 'dailyLimitReached') : 'Analyze Code/Schematic'}
            </Button>

            {/* Code Analysis Results */}
            {codeAnalysisResult && !showCodeSolutions && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Problems Found:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  {codeAnalysisResult.problems.map((problem, index) => (
                    <li key={index}>{problem}</li>
                  ))}
                </ul>
                <Button 
                  onClick={() => setShowCodeSolutions(true)}
                  className="mt-3"
                  variant="secondary"
                >
                  View Solutions
                </Button>
              </div>
            )}

            {/* Solutions View */}
            {showCodeSolutions && codeAnalysisResult && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Suggested Fixes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                    {codeAnalysisResult.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>

                {codeAnalysisResult.correctedCode && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h4 className="font-semibold mb-2">Corrected Code:</h4>
                    <pre className="text-sm bg-black text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {codeAnalysisResult.correctedCode}
                    </pre>
                  </div>
                )}

                <Button 
                  onClick={() => setShowCodeSolutions(false)}
                  variant="outline"
                  className="w-full"
                >
                  Back to Problems
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Description and Analysis */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {getScanTranslation(selectedLanguage, 'describeTheIssue')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">{getScanTranslation(selectedLanguage, 'whatsWrong')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={getScanTranslation(selectedLanguage, 'describeProblemPlaceholder')}
                rows={5}
              />
            </div>

            <Button 
              onClick={async () => {
                if (!description.trim()) {
                  toast.error(getScanTranslation(selectedLanguage, 'provideDescription'));
                  return;
                }
                if (!canScan) {
                  toast.error(getScanTranslation(selectedLanguage, 'scanLimitReachedMessage'));
                  return;
                }
                setLoading(true);
                try {
                  const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(devicePhoto!); // devicePhoto is guaranteed to be File | null, but we check for null in handleStep1Next, so it's safe to assert here
                  });
                  
                  // Translate user input to English for AI processing
                  const translatedDeviceName = await translateToEnglish(deviceName, selectedLanguage);
                  const translatedDescription = await translateToEnglish(description, selectedLanguage);
                  
                  const { data, error } = await supabase.functions.invoke('analyze-device-and-generate-questions', {
                    body: {
                      deviceName: translatedDeviceName,
                      imageBase64: base64.split(',')[1],
                      description: translatedDescription,
                      language: selectedLanguage,
                    },
                  });
                  if (error) throw error;
                  
                  // Translate questions back to user's language
                  const translatedQuestions = await Promise.all(
                    data.questions.map(async (q: any) => ({
                      ...q,
                      question: await translateFromEnglish(q.question, selectedLanguage),
                      category: await translateFromEnglish(q.category, selectedLanguage)
                    }))
                  );
                  
                  setQuestions(translatedQuestions);
                  setCurrentStep(3);
                } catch (error) {
                  console.error('Error generating questions:', error);
                  toast.error(getScanTranslation(selectedLanguage, 'failedToGenerateQuestions'));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !description.trim() || !devicePhoto || !canScan}
              className="w-full"
            >
              {loading ? getScanTranslation(selectedLanguage, 'analyzing') : !canScan ? getScanTranslation(selectedLanguage, 'dailyLimitReached') : getScanTranslation(selectedLanguage, 'analyzeAndGenerateQuestions')}
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
              {getScanTranslation(selectedLanguage, 'answerTheseQuestions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {getScanTranslation(selectedLanguage, 'answersHelpText')}
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
                  placeholder={getScanTranslation(selectedLanguage, 'yourAnswerPlaceholder')}
                  rows={2}
                  className="w-full"
                />
              </div>
            ))}

            <Button 
              onClick={async () => {
                if (!canScan) {
                  toast.error(getScanTranslation(selectedLanguage, 'scanLimitReachedMessage'));
                  return;
                }
                setLoading(true);
                try {
                  // Translate user answers to English for AI processing
                  const translatedAnswers: { [key: string]: string } = {};
                  for (const [questionId, answer] of Object.entries(answers)) {
                    if (answer.trim()) {
                      translatedAnswers[questionId] = await translateToEnglish(answer, selectedLanguage);
                    }
                  }
                  
                  const { data, error } = await supabase.functions.invoke('generate-repair-diagnosis', {
                    body: {
                      deviceName: await translateToEnglish(deviceName, selectedLanguage),
                      description: await translateToEnglish(description, selectedLanguage),
                      questions,
                      answers: translatedAnswers,
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

                  // Call onScanComplete callback to update scan count
                  if (onScanComplete) {
                    onScanComplete();
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