import React, { useState, useRef } from 'react';
import { Camera, Upload, Image, FileText, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface DiagnosticQuestion {
  id: string;
  question: string;
  answer: string;
}

interface FinalDiagnosis {
  problem: string;
  reason: string;
  solution: string[];
  tools_required: string[];
  estimated_cost: string;
  tip: string;
}

const Scan = () => {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [imageAnalysis, setImageAnalysis] = useState('');
  const [userDescription, setUserDescription] = useState('');
  const [descriptionAnalysis, setDescriptionAnalysis] = useState('');
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<DiagnosticQuestion[]>([]);
  const [finalDiagnosis, setFinalDiagnosis] = useState<FinalDiagnosis | null>(null);
  const [alternativeSolutions, setAlternativeSolutions] = useState<FinalDiagnosis[]>([]);
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();

  // Fetch remaining scans for free users
  React.useEffect(() => {
    if (user && !isPremium) {
      fetchRemainingScans();
    }
  }, [user, isPremium]);

  const fetchRemainingScans = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('remainingscans')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setRemainingScans(data.remainingscans);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        setImageAnalysis('');
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG or PNG image.",
          variant: "destructive",
        });
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Step 1: Image & Device Analysis
  const handleImageAnalysis = async () => {
    if (!selectedImage || !deviceName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select an image and enter a device name.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the scan feature.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsAnalyzing(true);

    try {
      const imageBase64 = await convertToBase64(selectedImage);

      const { data, error } = await supabase.functions.invoke('scan-device', {
        body: {
          imageBase64,
          deviceName: deviceName.trim()
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setImageAnalysis(data.analysis);
        setStep(2);
        if (!isPremium && data.remainingScans !== undefined) {
          setRemainingScans(data.remainingScans);
        }
        toast({
          title: "Image analysis complete",
          description: "Device image has been analyzed successfully.",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || 'Failed to analyze the image. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Generate clarification questions
  const handleDescriptionSubmit = async () => {
    if (!userDescription.trim()) {
      toast({
        title: "Missing description",
        description: "Please provide a detailed description of the issue.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gemini-analyze-description', {
        body: {
          description: userDescription.trim(),
          previousAnalysis: imageAnalysis,
          questionAnswers: {},
          language: 'en'
        }
      });

      if (error) throw error;

      if (data.analysis && data.questions) {
        setDescriptionAnalysis(data.analysis);
        // Generate at least 5 targeted questions
        const questions = data.questions.slice(0, 5).map((q: string, index: number) => ({
          id: `question_${index}`,
          question: q,
          answer: ''
        }));
        setDiagnosticQuestions(questions);
        setStep(3);
        toast({
          title: "Description analyzed",
          description: "Diagnostic questions have been generated.",
        });
      } else {
        throw new Error(data.error || 'Failed to analyze description');
      }
    } catch (error: any) {
      console.error('Description analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || 'Failed to analyze description. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3: Process answers and generate final diagnosis
  const handleQuestionsSubmit = async () => {
    setIsAnalyzing(true);
    try {
      const questionAnswers = diagnosticQuestions.reduce((acc, q) => {
        if (q.answer.trim()) {
          acc[q.question] = q.answer;
        }
        return acc;
      }, {} as Record<string, string>);

      const { data, error } = await supabase.functions.invoke('gemini-generate-report', {
        body: {
          deviceName,
          imageAnalysis,
          description: userDescription,
          questionAnswers,
          language: 'en'
        }
      });

      if (error) throw error;

      if (data.report) {
        setFinalDiagnosis(data.report);
        setStep(4);
        toast({
          title: "Diagnosis complete",
          description: "Final diagnosis and solution generated.",
        });
      } else {
        throw new Error(data.error || 'Failed to generate diagnosis');
      }
    } catch (error: any) {
      console.error('Final diagnosis error:', error);
      toast({
        title: "Diagnosis failed",
        description: error.message || 'Failed to generate final diagnosis. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 5: Generate alternative solutions
  const handleGenerateAlternatives = async () => {
    setIsAnalyzing(true);
    try {
      // For now, we'll create some mock alternative solutions
      // In a real implementation, you'd call another AI function
      const alternatives: FinalDiagnosis[] = [
        {
          problem: "Alternative issue #1",
          reason: "Secondary possible cause",
          solution: ["Alternative step 1", "Alternative step 2"],
          tools_required: ["Tool A", "Tool B"],
          estimated_cost: "Medium",
          tip: "Alternative prevention tip"
        },
        {
          problem: "Alternative issue #2", 
          reason: "Third possible cause",
          solution: ["Different step 1", "Different step 2"],
          tools_required: ["Tool C", "Tool D"],
          estimated_cost: "Low",
          tip: "Different prevention tip"
        }
      ];
      
      setAlternativeSolutions(alternatives);
      setStep(5);
      toast({
        title: "Alternative solutions generated",
        description: "Additional possible solutions have been provided.",
      });
    } catch (error: any) {
      console.error('Alternative solutions error:', error);
      toast({
        title: "Failed to generate alternatives",
        description: error.message || 'Failed to generate alternative solutions.',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setStep(1);
    setSelectedImage(null);
    setDeviceName('');
    setImageAnalysis('');
    setUserDescription('');
    setDescriptionAnalysis('');
    setDiagnosticQuestions([]);
    setFinalDiagnosis(null);
    setAlternativeSolutions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuestionAnswerChange = (questionId: string, answer: string) => {
    setDiagnosticQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, answer } : q)
    );
  };


  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} onRefresh={() => window.location.reload()} />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Device Scanner</h1>
            {!isPremium && remainingScans !== null && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {remainingScans} scans left today
              </Badge>
            )}
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Step 1 – Image & Device Analysis
                </CardTitle>
                <CardDescription>
                  Upload an image of your device and provide the device name for initial analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deviceName">Device Name *</Label>
                  <Input
                    id="deviceName"
                    placeholder="e.g., iPhone 12, Samsung TV, Dell Laptop"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Select Image *</Label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageSelect}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    {selectedImage ? (
                      <div className="space-y-2">
                        <Image className="w-8 h-8 mx-auto text-primary" />
                        <p className="text-sm font-medium">{selectedImage.name}</p>
                        <p className="text-xs text-muted-foreground">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload an image</p>
                        <p className="text-xs text-muted-foreground">JPEG or PNG only</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleImageAnalysis} 
                  disabled={!selectedImage || !deviceName.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing Image...' : 'Analyze Device'}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Step 2 – User Description Analysis
                </CardTitle>
                <CardDescription>
                  Image analysis complete. Now describe the functional issues you're experiencing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Image Analysis Results:</h4>
                  <p className="text-sm whitespace-pre-wrap">{imageAnalysis}</p>
                </div>
                
                <div>
                  <Label htmlFor="description">Describe the Problem *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe functional issues: when it started, what symptoms you observe, any error messages, what was happening when the problem occurred, etc."
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                
                <Button 
                  onClick={handleDescriptionSubmit} 
                  disabled={!userDescription.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing Description...' : 'Continue to Questions'}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Step 3 – Clarification Questions
                </CardTitle>
                <CardDescription>
                  Based on your image and description, answer these targeted questions to narrow down the root cause.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Answering these questions will help me give you the most accurate solution. 
                    You may skip them, but your diagnosis might be less precise.
                  </p>
                </div>

                {descriptionAnalysis && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Combined Analysis:</h4>
                    <p className="text-sm whitespace-pre-wrap">{descriptionAnalysis}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {diagnosticQuestions.map((q, index) => (
                    <div key={q.id} className="space-y-2">
                      <Label htmlFor={q.id}>
                        <span className="font-medium">Question {index + 1}:</span> {q.question}
                      </Label>
                      <Textarea
                        id={q.id}
                        placeholder="Your answer (or type 'skip' to skip this question)"
                        value={q.answer}
                        onChange={(e) => handleQuestionAnswerChange(q.id, e.target.value)}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleQuestionsSubmit} 
                  disabled={isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Generating Final Diagnosis...' : 'Get Final Diagnosis & Solution'}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Step 4 – Final Diagnosis & Solution
                </CardTitle>
                <CardDescription>
                  Based on all information provided, here is the most likely main issue and solution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {finalDiagnosis && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Problem:</h4>
                      <p className="text-green-700 dark:text-green-300">{finalDiagnosis.problem}</p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Reason:</h4>
                      <p className="text-blue-700 dark:text-blue-300">{finalDiagnosis.reason}</p>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-3">Solution:</h4>
                      <ol className="list-decimal list-inside space-y-2">
                        {(Array.isArray(finalDiagnosis.solution) ? finalDiagnosis.solution : [finalDiagnosis.solution]).filter(Boolean).map((step, index) => (
                          <li key={index} className="text-sm">{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Tools Required:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(Array.isArray(finalDiagnosis.tools_required) ? finalDiagnosis.tools_required : [finalDiagnosis.tools_required]).filter(Boolean).map((tool, index) => (
                            <li key={index} className="text-sm">{tool}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Estimated Cost:</h4>
                        <p className="text-sm">{finalDiagnosis.estimated_cost}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Tip/Trick:</h4>
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm">{finalDiagnosis.tip}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold">Does this solution work for you?</h4>
                  <div className="flex gap-2">
                    <Button onClick={handleNewScan} variant="outline" className="flex-1">
                      Yes, it worked!
                    </Button>
                    <Button onClick={handleGenerateAlternatives} variant="destructive" className="flex-1">
                      No, need alternatives
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  Step 5 – Alternative Solutions
                </CardTitle>
                <CardDescription>
                  Since the first solution didn't work, here are other possible problems and solutions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {alternativeSolutions.map((solution, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-lg">Alternative Solution #{index + 1}</h4>
                    
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                      <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">Problem:</h5>
                      <p className="text-red-700 dark:text-red-300 text-sm">{solution.problem}</p>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Reason:</h5>
                      <p className="text-blue-700 dark:text-blue-300 text-sm">{solution.reason}</p>
                    </div>

                    <div className="p-3 bg-muted rounded">
                      <h5 className="font-medium mb-2">Solution:</h5>
                      <ol className="list-decimal list-inside space-y-1">
                        {(Array.isArray(solution.solution) ? solution.solution : [solution.solution]).filter(Boolean).map((step, stepIndex) => (
                          <li key={stepIndex} className="text-sm">{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <h6 className="font-medium mb-1">Tools:</h6>
                        <ul className="list-disc list-inside">
                          {(Array.isArray(solution.tools_required) ? solution.tools_required : [solution.tools_required]).filter(Boolean).map((tool, toolIndex) => (
                            <li key={toolIndex}>{tool}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium mb-1">Cost:</h6>
                        <p>{solution.estimated_cost}</p>
                      </div>
                      <div>
                        <h6 className="font-medium mb-1">Prevention:</h6>
                        <p>{solution.tip}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <Button onClick={handleNewScan} className="w-full">
                  Start New Diagnosis
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;