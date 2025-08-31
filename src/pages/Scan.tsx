import React, { useState, useRef } from 'react';
import { Camera, Upload, Image, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Scan = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const [step, setStep] = useState(1); // New state for current step
  const [description, setDescription] = useState(''); // New state for detailed description
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<string[]>([]); // New state for diagnostic questions
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({}); // New state for question answers
  const [finalReport, setFinalReport] = useState<any | null>(null); // New state for final report
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
        setAnalysisResult(null);
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

  const handleScan = async () => {
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
        // setAnalysisResult(data.analysis);
        setAnalysisResult(JSON.stringify({ device_name: deviceName, image_analysis: data.analysis }, null, 2));
        setStep(2);
        if (!isPremium && data.remainingScans !== undefined) {
          setRemainingScans(data.remainingScans);
        }
        toast({
          title: "Analysis complete",
          description: "Your device has been analyzed successfully.",
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      toast({
        title: "Scan failed",
        description: error.message || 'Failed to analyze the image. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setSelectedImage(null);
    setDeviceName('');
    setAnalysisResult(null);
    setStep(1); // Reset step to 1
    setDescription(''); // Reset description
    setDiagnosticQuestions([]); // Reset questions
    setQuestionAnswers({}); // Reset answers
    setFinalReport(null); // Reset final report
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnswerChange = (question: string, answer: string) => {
    setQuestionAnswers(prev => ({ ...prev, [question]: answer }));
  };

  const handleSubmitQuestions = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit diagnostic questions.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (diagnosticQuestions.length > 0 && Object.values(questionAnswers).some(answer => !answer.trim() || answer.trim().toLowerCase() === 'skip')) {
      toast({
        title: "Missing answers",
        description: "Please provide answers to all diagnostic questions or explicitly type 'skip'.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gemini-generate-report', {
        body: {
          deviceName: deviceName,
          imageAnalysis: analysisResult.image_analysis,
          description: description,
          questionAnswers: questionAnswers,
          language: 'en' // Assuming English for now
        },
      });

      if (error) {
        throw error;
      }

      if (data.report) {
        setFinalReport(data.report);
        setStep(4); // Move to Step 4: Final Report
        toast({
          title: "Report generated",
          description: "The final repair report has been generated.",
        });
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: "Report generation failed",
        description: error.message || 'Failed to generate report. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDescriptionSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit a detailed description.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Missing description",
        description: "Please provide a detailed description of the issue.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true); // Reuse isAnalyzing for this step
    try {
      const { data, error } = await supabase.functions.invoke('gemini-analyze-description', {
        body: {
          description: description.trim(),
          previousAnalysis: analysisResult.image_analysis, // Pass the initial image analysis
          questionAnswers: {},
          language: 'en' // Assuming English for now, can be dynamic
        },
      });

      if (error) {
        throw error;
      }

      if (data.analysis && data.questions) {
        setAnalysisResult(data.analysis); // Store the refined analysis
        setDiagnosticQuestions(data.questions); // Store the diagnostic questions
        setStep(3); // Move to Step 3: Diagnostic Questions
        toast({
          title: "Description analyzed",
          description: "Your description has been analyzed and diagnostic questions generated.",
        });
      } else {
        throw new Error(data.error || 'Failed to refine description');
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

          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Step 1: Scan Your Device
                </CardTitle>
                <CardDescription>
                  Upload an image of your device to get AI-powered analysis and repair suggestions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deviceName">Device Name</Label>
                  <Input
                    id="deviceName"
                    placeholder="e.g., iPhone 12, Samsung TV, Dell Laptop"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Select Image</Label>
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
                  onClick={handleScan} 
                  disabled={!selectedImage || !deviceName.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Scan Device'}
                </Button>
              </CardContent>
            </Card>
          ) : step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Step 2: Description Refinement
                </CardTitle>
                <CardDescription>
                  Based on your input, here's what we detected. Please provide a more detailed description of the issue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold">Device & Image Analysis:</h3>
                  <div className="whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
                    {JSON.stringify({ device_name: deviceName, image_analysis: analysisResult.image_analysis }, null, 2)}
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Detailed Description</Label>
                  <textarea
                    id="description"
                    placeholder="Describe the problem in detail: when it started, what happened, any error messages, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button onClick={handleDescriptionSubmit} className="w-full" disabled={isAnalyzing}>
                  {isAnalyzing ? 'Analyzing Description...' : 'Submit Description'}
                </Button>
              </CardContent>
            </Card>
          ) : step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Step 3: Diagnostic Questions
                </CardTitle>
                <CardDescription>
                  Please answer the following questions to help us pinpoint the issue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold">Refined Analysis:</h3>
                  <div className="whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
                    {analysisResult}
                  </div>
                </div>
                {diagnosticQuestions.length > 0 ? (
                  <div className="space-y-4">
                    {diagnosticQuestions.map((question, index) => (
                      <div key={index} className="space-y-2">
                        <Label htmlFor={`question-${index}`}>{question}</Label>
                        <Input
                          id={`question-${index}`}
                          placeholder="Your answer or type 'skip'"
                          value={questionAnswers[question] || ''}
                          onChange={(e) => handleAnswerChange(question, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No further diagnostic questions at this time. Proceed to report generation.</p>
                )}
                <Button onClick={handleSubmitQuestions} className="w-full" disabled={isAnalyzing || diagnosticQuestions.length === 0}>
                  {isAnalyzing ? 'Submitting Answers...' : 'Generate Report'}
                </Button>
              </CardContent>
            </Card>
          ) : step === 4 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Step 4: Final Report
                </CardTitle>
                <CardDescription>
                  Here is the final diagnosis and repair guide for your {deviceName}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {finalReport ? (
                  <div className="prose prose-sm max-w-none space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Problem:</h3>
                      <p>{finalReport.problem}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Reason:</h3>
                      <p>{finalReport.reason}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Solutions:</h3>
                      <ol className="list-decimal list-inside">
                        {finalReport.solutions.map((solution: string, index: number) => (
                          <li key={index}>{solution}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Tools Required:</h3>
                      <ul className="list-disc list-inside">
                        {finalReport.tools_required.map((tool: string, index: number) => (
                          <li key={index}>{tool}</li>
                        ))}
                      </ul >
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Estimated Cost:</h3>
                      <p>{finalReport.estimated_cost}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Tip to Avoid:</h3>
                      <p>{finalReport.tip}</p>
                    </div>
                  </div>
                ) : (
                  <p>Generating final report...</p>
                )}
                <Button onClick={handleNewScan} className="w-full">
                  Scan Another Device
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;