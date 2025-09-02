import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTranslation } from '@/lib/translations';
import { ImageWithSignedUrl } from '@/components/ImageWithSignedUrl';

interface Question {
  id: string;
  question: string;
  answer?: string;
}

interface RepairReport {
  problem: string;
  reason: string;
  solutions: string[];
  tools_required: string[];
  estimated_cost: string;
  tip: string;
}

interface StepData {
  imageAnalysis?: string;
  questions1?: Question[];
  description?: string;
  descriptionAnalysis?: string;
  questions2?: Question[];
  finalSolution?: RepairReport;
}

interface DiagnosticFlowProps {
  selectedLanguage: string;
}

const DiagnosticFlow: React.FC<DiagnosticFlowProps> = ({ selectedLanguage }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stepData, setStepData] = useState<StepData>({});
  const [uploadedImages, setUploadedImages] = useState<string[]>([]); // To store base64 for display
  const [uploadedPublicUrls, setUploadedPublicUrls] = useState<string[]>([]); // To store public URLs for database
  const [deviceName, setDeviceName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const t = (key: string) => getTranslation(selectedLanguage, key);

  const steps = [
    { number: 1, title: t('uploadImage'), description: t('uploadImageDesc') },
    { number: 2, title: t('aiAnalysis'), description: t('aiAnalysisDesc') },
    { number: 3, title: t('questions'), description: t('questionsDesc') },
    { number: 4, title: t('description'), description: t('descriptionDesc') },
    { number: 5, title: t('finalQuestions'), description: t('finalQuestionsDesc') },
    { number: 6, title: t('solution'), description: t('solutionDesc') }
  ];

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (!user) {
      toast({
        title: t('authRequired'),
        description: t('authRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const newUploadedBase64s: string[] = [];
    const newPublicUrls: string[] = [];

    try {
      const uploadPromises = files.map(async (file, index) => {
        // Read file as Base64 for AI analysis and temporary display
        const base64: string = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        newUploadedBase64s.push(base64);

        // Upload to Supabase Storage
        const now = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const objectPath = `${user.id}/${now}_${index}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('device-images')
          .upload(objectPath, file, { 
            upsert: true, 
            cacheControl: '3600',
            contentType: file.type
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          toast({
            title: t('uploadError'),
            description: `${t('failedUpload')} ${file.name}: ${uploadError.message}`,
            variant: "destructive"
          });
          return null;
        }

        // Store the object path instead of public URL for security
        newPublicUrls.push(objectPath);
        return objectPath;
      });

      await Promise.allSettled(uploadPromises);

      setUploadedImages(newUploadedBase64s);
      setUploadedPublicUrls(newPublicUrls);

      // Only send the first image for AI analysis
      if (newUploadedBase64s.length > 0) {
        const { data, error } = await supabase.functions.invoke('gemini-analyze-image', {
          body: { imageBase64: newUploadedBase64s[0], deviceName, language: selectedLanguage }
        });

        if (error) throw error;

        setStepData(prev => ({
          ...prev,
          imageAnalysis: data.analysis,
          questions1: data.questions.map((q: string, i: number) => ({ id: `q1_${i}`, question: q }))
        }));
        setCurrentStep(3);
      } else {
        toast({
          title: t('noImagesUploaded'),
          description: t('noImagesUploadedDesc'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during image handling:', error);
      toast({
        title: t('imageProcessingError'),
        description: t('imageProcessingErrorDesc'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionAnswer = (questionId: string, answer: string, questionSet: 'questions1' | 'questions2') => {
    setStepData(prev => ({
      ...prev,
      [questionSet]: prev[questionSet]?.map(q => 
        q.id === questionId ? { ...q, answer } : q
      )
    }));
  };

  const handleDescriptionSubmit = async () => {
    if (!stepData.description?.trim()) {
      toast({
        title: t('descriptionRequired'),
        description: t('descriptionRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const answers1 = stepData.questions1?.reduce((acc, q) => {
        if (q.answer) acc[q.question] = q.answer;
        return acc;
      }, {} as Record<string, string>) || {};

      const { data, error } = await supabase.functions.invoke('gemini-analyze-description', {
        body: {
          description: stepData.description,
          previousAnalysis: stepData.imageAnalysis,
          questionAnswers: answers1,
          language: selectedLanguage
        }
      });

      if (error) throw error;

      setStepData(prev => ({
        ...prev,
        descriptionAnalysis: data.analysis,
        questions2: data.questions.map((q: string, i: number) => ({ id: `q2_${i}`, question: q }))
      }));
      setCurrentStep(5);
    } catch (error) {
      console.error('Error analyzing description:', error);
      toast({
        title: t('analysisError'),
        description: t('analysisErrorDesc'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalDiagnosis = async () => {
    setLoading(true);
    try {
      const allAnswers = {
        questions1: stepData.questions1?.reduce((acc, q) => {
          if (q.answer) acc[q.question] = q.answer;
          return acc;
        }, {} as Record<string, string>) || {},
        questions2: stepData.questions2?.reduce((acc, q) => {
          if (q.answer) acc[q.question] = q.answer;
          return acc;
        }, {} as Record<string, string>) || {},
        description: stepData.description
      };

      const { data, error } = await supabase.functions.invoke('gemini-generate-report', {
        body: {
          deviceName,
          imageAnalysis: stepData.imageAnalysis,
          description: stepData.description,
          questionAnswers: allAnswers,
          language: selectedLanguage
        }
      });

      if (error) throw error;

      setStepData(prev => ({ ...prev, finalSolution: data.report }));
      setCurrentStep(6);

      // Save repair session to database
      if (user) {
        try {
          await supabase
            .from('diagnostic_sessions')
            .insert({
              user_id: user.id,
              device_category: deviceName,
              symptoms_text: stepData.description,
              image_urls: uploadedPublicUrls, // Save uploaded image public URLs
               ai_analysis: JSON.parse(JSON.stringify({
                 finalSolution: data.report,
                 deviceName
               })),
              status: 'completed'
            });
        } catch (dbError) {
          console.error('Error saving diagnostic session:', dbError);
          // Don't show error to user as the main function worked
        }
      }
    } catch (error) {
      console.error('Error getting final solution:', error);
      toast({
        title: t('solutionError'),
        description: t('solutionErrorDesc'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t('step')} {currentStep} {t('of')} {steps.length}</span>
          <span>{Math.round(progress)}% {t('complete')}</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 6 && <CheckCircle className="h-5 w-5 text-green-500" />}
            {steps[currentStep - 1]?.title}
          </CardTitle>
          <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceName">{t('deviceName')} *</Label>
                <Input
                  id="deviceName"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={t('deviceNamePlaceholder')}
                  required
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button 
                onClick={() => {
                  if (!deviceName.trim()) {
                    toast({
                      title: t('deviceNameRequired'),
                      description: t('deviceNameRequiredDesc'),
                      variant: "destructive"
                    });
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="w-full h-32 border-2 border-dashed border-border hover:border-primary"
                variant="outline"
                disabled={loading}
              >
                <div className="text-center">
                  {loading ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                  )}
                  <p>{loading ? t('analyzing') : t('uploadImageButton')}</p>
                </div>
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 mx-auto animate-spin" />
              <p>{t('aiAnalyzing')}</p>
            </div>
          )}

          {currentStep === 3 && stepData.questions1 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{t('initialAnalysis')}</h4>
                <p className="text-sm">{stepData.imageAnalysis}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t('helpUnderstand')}</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center gap-1"
                  >
                    <SkipForward className="h-4 w-4" />
                    {t('skip')}
                  </Button>
                </div>
                {stepData.questions1.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label>{q.question}</Label>
                    <Textarea
                      value={q.answer || ''}
                      onChange={(e) => handleQuestionAnswer(q.id, e.target.value, 'questions1')}
                      placeholder={t('yourAnswer')}
                      rows={2}
                    />
                  </div>
                ))}
                <Button onClick={() => setCurrentStep(4)} className="w-full">
                  {t('continue')}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">{t('describeProblemo')} *</Label>
                <Textarea
                  id="description"
                  value={stepData.description || ''}
                  onChange={(e) => setStepData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('describeProblemPlaceholder')}
                  rows={4}
                  required
                />
              </div>
              <Button 
                onClick={handleDescriptionSubmit} 
                disabled={loading || !stepData.description?.trim()}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t('analyzeDescription')}
              </Button>
            </div>
          )}

          {currentStep === 5 && stepData.questions2 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{t('updatedAnalysis')}</h4>
                <p className="text-sm">{stepData.descriptionAnalysis}</p>
              </div>

              {stepData.questions2.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{t('finalClarifications')}</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleFinalDiagnosis}
                      className="flex items-center gap-1"
                    >
                      <SkipForward className="h-4 w-4" />
                      {t('skipToSolution')}
                    </Button>
                  </div>
                  {stepData.questions2.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <Label>{q.question}</Label>
                      <Textarea
                        value={q.answer || ''}
                        onChange={(e) => handleQuestionAnswer(q.id, e.target.value, 'questions2')}
                        placeholder={t('yourAnswer')}
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button onClick={handleFinalDiagnosis} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {t('getRepairSolution')}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleFinalDiagnosis} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {t('getRepairSolution')}
                </Button>
              )}
            </div>
          )}

          {currentStep === 6 && stepData.finalSolution && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  {t('repairSolutionFound')}
                </h4>
                <div className="space-y-4 text-green-700 dark:text-green-300">
                  <div className="space-y-2">
                    <h5 className="font-semibold text-green-800 dark:text-green-200">{t('problem')}</h5>
                    <p className="text-sm">{stepData.finalSolution.problem || 'Problem identification needed'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-green-800 dark:text-green-200">{t('reason')}</h5>
                    <p className="text-sm">{stepData.finalSolution.reason || 'Root cause analysis needed'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-green-800 dark:text-green-200">{t('solution')}</h5>
                    <div className="text-sm">
                      {Array.isArray(stepData.finalSolution.solutions) && stepData.finalSolution.solutions.length > 0 ? (
                        <ol className="list-decimal list-inside space-y-1">
                          {stepData.finalSolution.solutions.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      ) : (
                        <p>Stop using the device and seek professional help immediately.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-green-800 dark:text-green-200">{t('toolsRequired')}</h5>
                    <div className="text-sm">
                      {Array.isArray(stepData.finalSolution.tools_required) && stepData.finalSolution.tools_required.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {stepData.finalSolution.tools_required.map((tool, index) => (
                            <li key={index}>{tool}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No tools specified</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-green-800 dark:text-green-200">{t('estimatedCost')}</h5>
                    <p className="text-sm">{stepData.finalSolution.estimated_cost || 'Cost estimate unavailable'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-green-800 dark:text-green-200">{t('tip')}</h5>
                    <p className="text-sm">{stepData.finalSolution.tip || 'Follow manufacturer guidelines for maintenance'}</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setCurrentStep(1);
                  setStepData({});
                  setUploadedImages([]);
                  setUploadedPublicUrls([]);
                  setDeviceName('');
                }}
                variant="outline"
                className="w-full"
              >
                {t('startNewDiagnosis')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('uploadedImages')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {uploadedImages.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Uploaded device ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiagnosticFlow;