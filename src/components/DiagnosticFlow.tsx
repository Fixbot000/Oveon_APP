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

  // Translation helper function
  const translateText = async (text: string): Promise<string> => {
    if (!text || selectedLanguage === 'en') return text;
    
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
  const [translatedQuestions, setTranslatedQuestions] = useState<{ id: string, category: string, question: string }[]>([]);
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
              {selectedLanguage === 'en' ? 'Device Information' :
               selectedLanguage === 'hi' ? 'डिवाइस की जानकारी' :
               selectedLanguage === 'ta' ? 'சாதன தகவல்' :
               selectedLanguage === 'te' ? 'పరికర సమాచారం' :
               selectedLanguage === 'kn' ? 'ಸಾಧನ ಮಾಹಿತಿ' : 'Device Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deviceName">
                {selectedLanguage === 'en' ? 'Device Name' :
                 selectedLanguage === 'hi' ? 'डिवाइस का नाम' :
                 selectedLanguage === 'ta' ? 'சாதன பெயர்' :
                 selectedLanguage === 'te' ? 'పరికరం పేరు' :
                 selectedLanguage === 'kn' ? 'ಸಾಧನದ ಹೆಸರು' : 'Device Name'}
              </Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., Samsung TV"
              />
            </div>
            
            <div>
              <Label htmlFor="devicePhoto">Device Photo</Label>
              <label htmlFor="devicePhotoInput" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer items-center">
                {devicePhoto ? devicePhoto.name : "Upload File"}
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
              {selectedLanguage === 'en' ? 'Describe the Issue' :
               selectedLanguage === 'hi' ? 'समस्या का वर्णन करें' :
               selectedLanguage === 'ta' ? 'பிரச்சினையை விவரிக்கவும்' :
               selectedLanguage === 'te' ? 'సమస్యను వివరించండి' :
               selectedLanguage === 'kn' ? 'ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ' : 'Describe the Issue'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">
                {selectedLanguage === 'en' ? "What's wrong with your device?" :
                 selectedLanguage === 'hi' ? 'आपके डिवाइस में क्या समस्या है?' :
                 selectedLanguage === 'ta' ? 'உங்கள் சாதனத்தில் என்ன தவறு?' :
                 selectedLanguage === 'te' ? 'మీ పరికరంలో ఏమి తప్పు?' :
                 selectedLanguage === 'kn' ? 'ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಏನು ತಪ್ಪಾಗಿದೆ?' : "What's wrong with your device?"}
              </Label>
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
                   
                   // Translate questions immediately if not English
                   if (selectedLanguage !== 'en') {
                     const translatedQs = await Promise.all(
                       data.questions.map(async (q: any) => ({
                         ...q,
                         question: await translateText(q.question),
                         category: await translateText(q.category)
                       }))
                     );
                     setTranslatedQuestions(translatedQs);
                   } else {
                     setTranslatedQuestions(data.questions);
                   }
                   
                   setCurrentStep(3);
                } catch (error) {
                  console.error('Error generating questions:', error);
                  toast.error('Failed to generate questions. Please try again.');
                } finally {
                  setLoading(false);
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
              {selectedLanguage === 'en' ? 'Answer These Questions' :
               selectedLanguage === 'hi' ? 'इन सवालों के जवाब दें' :
               selectedLanguage === 'ta' ? 'இந்த கேள்விகளுக்கு பதிலளிக்கவும்' :
               selectedLanguage === 'te' ? 'ఈ ప్రశ్నలకు సమాధానం ఇవ్వండి' :
               selectedLanguage === 'kn' ? 'ಈ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ' : 'Answer These Questions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {selectedLanguage === 'en' ? 'Please answer these questions to help identify the exact problem. Skip any that don\'t apply.' :
                 selectedLanguage === 'hi' ? 'सटीक समस्या की पहचान में मदद के लिए कृपया इन सवालों के जवाब दें। जो लागू न हों उन्हें छोड़ दें।' :
                 selectedLanguage === 'ta' ? 'சரியான பிரச்சினையை அடையாளம் காண உதவ தயவுசெய்து இந்த கேள்விகளுக்கு பதிலளிக்கவும். பொருந்தாதவற்றைத் தவிர்க்கவும்।' :
                 selectedLanguage === 'te' ? 'ఖచ్చితమైన సమస్యను గుర్తించడంలో సహాయపడటానికి దయచేసి ఈ ప్రశ్నలకు సమాధానం ఇవ్వండి. వర్తించనివాటిని దాటవేయండి।' :
                 selectedLanguage === 'kn' ? 'ನಿಖರವಾದ ಸಮಸ್ಯೆಯನ್ನು ಗುರುತಿಸಲು ಸಹಾಯ ಮಾಡಲು ದಯವಿಟ್ಟು ಈ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ. ಅನ್ವಯಿಸದವುಗಳನ್ನು ಬಿಟ್ಟುಬಿಡಿ।' : 
                 'Please answer these questions to help identify the exact problem. Skip any that don\'t apply.'}
              </p>
            </div>

            {translatedQuestions.map((question, index) => (
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
                  placeholder={selectedLanguage === 'en' ? "Your answer (optional)" : 
                    selectedLanguage === 'hi' ? "आपका उत्तर (वैकल्पिक)" :
                    selectedLanguage === 'ta' ? "உங்கள் பதில் (விருப்பமானது)" :
                    selectedLanguage === 'te' ? "మీ సమాధానం (ఐచ్ఛికం)" :
                    selectedLanguage === 'kn' ? "ನಿಮ್ಮ ಉತ್ತರ (ಐಚ್ಛಿಕ)" : "Your answer (optional)"}
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

                  // Call onScanComplete callback to update scan count
                  if (onScanComplete) {
                    onScanComplete();
                  }

                  setFinalDiagnosis(data);
                  navigate('/diagnosis-result', { state: { finalDiagnosis: data, selectedLanguage } });
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