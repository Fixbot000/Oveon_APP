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
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'; // Added Capacitor Camera imports
import { Switch } from '@/components/ui/switch'; // Added Switch import

const ANALYSE_QUESTION_GENERATE_V2_URL = 'https://djxdbltjwqavzhpkrnzr.supabase.co/functions/v1/analyse-question-generate-v2';

interface DiagnosticFlowProps {
  selectedLanguage: string;
  canScan?: boolean;
  onScanComplete?: () => void;
  loadingComponent?: React.ReactNode;
}

export default function DiagnosticFlow({ selectedLanguage, canScan = true, onScanComplete, loadingComponent }: DiagnosticFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
  console.log('Full user object:', user);
  console.log('User metadata isPremium:', isPremium);

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
  const [devicePhotoBase64, setDevicePhotoBase64] = useState<string | null>(null); // Changed to store Base64 string
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
  const [useAdvanceAnalysis, setUseAdvanceAnalysis] = useState(false); // New state for advance analysis
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

  const handlePhotoChange = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera, // Prefer camera
      });

      if (photo.base64String) {
        const base64Image = `data:image/jpeg;base64,${photo.base64String}`;
        setDevicePhotoBase64(photo.base64String); // Store raw base64 string
        setPhotoPreview(base64Image); // For image preview
        toast.success("Photo captured successfully!");
      }
    } catch (error: any) {
      console.error("Error capturing photo:", error);
      toast.error("Failed to capture photo: " + error.message || "Unknown error");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = (e.target?.result as string).split(',')[1];
        const base64Image = e.target?.result as string;
        setDevicePhotoBase64(base64String);
        setPhotoPreview(base64Image);
        toast.success("Image uploaded successfully!");
      };
      reader.onerror = (error) => {
        console.error("Error reading uploaded file:", error);
        toast.error("Failed to read uploaded image.");
      };
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
    if (!deviceName.trim() || !devicePhotoBase64) { // Changed to devicePhotoBase64
      toast.error('Please provide both device name and photo');
      return;
    }
    setCurrentStep(2);
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setDeviceName('');
    setDevicePhotoBase64(null);
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
              <div className="flex flex-col items-center gap-4">
                <Button 
                  onClick={handlePhotoChange} 
                  className="h-32 w-32 rounded-full flex flex-col items-center justify-center text-blue-500 border-2 border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                  variant="outline"
                  type="button"
                >
                  <Camera className="h-12 w-12" /> 
                  <span className="mt-2">Take Photo</span>
                </Button>
                <label htmlFor="deviceFileInput" className="w-full flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Upload Photo
                </label>
                <Input
                  id="deviceFileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
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
              disabled={!deviceName.trim() || !devicePhotoBase64 || !canScan}
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

            <div className="flex items-center space-x-2">
              <Switch
                id="advance-analysis"
                checked={useAdvanceAnalysis}
                onCheckedChange={setUseAdvanceAnalysis}
              />
              <Label htmlFor="advance-analysis">Enable Advance Analysis</Label>
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
                console.log('Loading started, currentStep:', currentStep, 'loading:', true);
                try {
                  // Using devicePhotoBase64 directly, no FileReader needed
                  if (!devicePhotoBase64) {
                    toast.error("No device photo found for analysis.");
                    setLoading(false);
                    console.log('Loading stopped (no photo), currentStep:', currentStep, 'loading:', false);
                    return;
                  }

                  let data: any;
                  let error: any;

                  const session = await supabase.auth.getSession();
                  console.log('Supabase session:', session);
                  console.log('Session data:', session.data);
                  console.log('Session data session:', session.data.session);
                  const accessToken = session.data.session?.access_token; // Declare locally
                  console.log('Retrieved accessToken:', accessToken);

                  if (!accessToken) {
                    throw new Error(
                      `User not authenticated. Please log in. Session: ${JSON.stringify(session)}, Access Token: ${accessToken}`
                    );
                  }

                  let finalDiagnosisResultData = null; // Initialize to store the result of Final_Diagnosis_Result2

                  if (useAdvanceAnalysis) {
                    // Invoke Advance_Analysis_Questions2 as it's already in use
                    ({ data, error } = await supabase.functions.invoke('Advance_Analysis_Questions2', {
                      body: {
                        deviceName,
                        imageBase64: devicePhotoBase64,
                        description,
                        language: selectedLanguage,
                      },
                    }));

                    if (error) {
                      toast.error("Supabase function 'Advance_Analysis_Questions2' invocation failed: " + error.message);
                      throw error;
                    }

                    // Invoke Final_Diagnosis_Result2
                    const finalDiagnosisResponse = await fetch('https://djxdbltjwqavzhpkrnzr.supabase.co/functions/v1/Final_Diagnosis_Result2', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${accessToken}`, // Assuming accessToken is available in scope
                        'apikey': 'sb_publishable_-hCLsCohcSoD-LpyiHMCqQ_NpcdapYz',
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        deviceName,
                        imageBase64: devicePhotoBase64,
                        description,
                        language: selectedLanguage,
                      }),
                    });

                    if (!finalDiagnosisResponse.ok) {
                      const errorData = await finalDiagnosisResponse.json();
                      console.error('Final_Diagnosis_Result2 function error response:', errorData);
                      throw new Error(errorData.message || 'Failed to invoke Final_Diagnosis_Result2 function');
                    }
                    finalDiagnosisResultData = await finalDiagnosisResponse.json();
                    console.log('Final_Diagnosis_Result2 function raw data:', finalDiagnosisResultData);

                  } else {
                    const response = await fetch(ANALYSE_QUESTION_GENERATE_V2_URL, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        deviceName,
                        imageBase64: devicePhotoBase64,
                        description,
                        language: selectedLanguage,
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      console.error('Question generation function error response:', errorData);
                      throw new Error(errorData.message || 'Failed to invoke question generation function');
                    }
                    data = await response.json();
                    console.log('Question generation function raw data:', data);
                  }
                  
                   if (error) {
                     toast.error("Supabase function invocation failed: " + error.message);
                     throw error;
                   }
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
                   console.log('setCurrentStep to 3, currentStep:', 3, 'loading:', loading);
                } catch (error: any) {
                  console.error('Error generating questions:', error);
                  let errorMessage = 'Failed to generate questions. Please try again.';
                  if (error.message.includes("Supabase function invocation failed")) {
                    errorMessage = error.message;
                  } else if (error.message) {
                    errorMessage = error.message;
                  }
                  toast.error(errorMessage);
                } finally {
                  setLoading(false);
                  console.log('Loading stopped (finally), currentStep:', currentStep, 'loading:', false);
                }
              }}
              disabled={loading || !description.trim() || !devicePhotoBase64 || !canScan}
              className="w-full"
            >
              {loading ? 'Analyzing...' : !canScan ? 'Daily Limit Reached' : 'Analyze & Generate Questions'}
            </Button>
            {loading && currentStep === 2 && (
              <div className="flex justify-center mt-4">
                {loadingComponent}
              </div>
            )}
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
                 selectedLanguage === 'te' ? 'ఖచ్చితమైన సమస్యను గుర్తించడానికి సహాయపడటానికి దయచేసి ఈ ప్రశ్నలకు సమాధానం ఇవ్వండి. వర్తించనివాటిని దాటవేయండి।' :
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
                  let data: any;
                  let error: any;
 
                  console.log('Invoking diagnosis function (Step 3)...');
                  ({ data, error } = await supabase.functions.invoke('generate-repair-diagnosis', {
                    body: {
                      deviceName,
                      description,
                      questions,
                      answers,
                      language: selectedLanguage,
                    },
                  }));
                  console.log('Diagnosis function raw data (Step 3):', data);
                  console.error('Diagnosis function error (Step 3):', error);
 
                  if (error) {
                    toast.error("Supabase function invocation failed in Step 3: " + error.message);
                    throw error;
                  }
                  
                  console.log('Final diagnosis data before processing (Step 3):', data);
                  // Save to scans table for history
                  console.log('Final diagnosis object before formatting (Step 3):', data);
                  console.log('Saving scan for user (Step 3):', user?.id);
                  const formatDiagnosisForHistory = (diagnosis: any) => {
                    return `Diagnosis data: ${JSON.stringify(diagnosis)}`; // Temporarily stringify for debugging
                     };

                     const scanToSave = {
                       user_id: user?.id,
                       device_name: deviceName,
                       result: formatDiagnosisForHistory(data)
                     };
                     console.log('Scan data to save (Step 3):', scanToSave);

                     const { error: saveError } = await supabase
                       .from('scans')
                       .insert(scanToSave);

                     if (saveError) {
                       console.error('Error saving scan to history (Step 3):', JSON.stringify(saveError));
                     }

                     // Call onScanComplete callback to update scan count
                     if (onScanComplete) {
                       // onScanComplete(); // Temporarily disabled due to ReferenceError
                     }

                     setFinalDiagnosis(data);
                     navigate('/diagnosis-result', { state: { finalDiagnosis: data, selectedLanguage } });
                     setCurrentStep(4);
                   } catch (error: any) {
                     console.error('Error generating final report (Step 3):', error);
                     toast.error('Failed to generate repair guide. Please try again.');
                   } finally {
                     setLoading(false);
                     console.log('Loading stopped (finally, Step 3), currentStep:', currentStep, 'loading:', false);
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