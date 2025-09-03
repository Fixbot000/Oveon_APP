import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Upload, Camera, AlertCircle, Wrench, DollarSign, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTranslation } from '@/lib/translations';

interface NameAnalysisResult {
  commonProblems: string[];
  deviceCategory: string;
}

interface PhotoAnalysisResult {
  visibleDamage: string[];
  damageAssessment: string;
}

interface DescriptionAnalysisResult {
  prioritizedProblems: string[];
  matchedKeywords: string[];
}

interface ClarifyingQuestion {
  id: string;
  question: string;
  category: string;
}

interface FinalSolutionReport {
  likelyProblem: string;
  reason: string;
  repairSolution: string[];
  toolsNeeded: string[];
  estimatedCost: string;
  extraTip: string;
  alternativeProblems?: Array<{
    problem: string;
    reasoning: string;
  }>;
}

interface DiagnosticFlowProps {
  selectedLanguage: string;
}

export default function DiagnosticFlow({ selectedLanguage }: DiagnosticFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1 data
  const [deviceName, setDeviceName] = useState('');
  const [devicePhoto, setDevicePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [nameAnalysis, setNameAnalysis] = useState<NameAnalysisResult | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);
  
  // Step 2 data
  const [userDescription, setUserDescription] = useState('');
  const [descriptionAnalysis, setDescriptionAnalysis] = useState<DescriptionAnalysisResult | null>(null);
  
  // Step 3 data
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  
  // Step 4 data
  const [finalReport, setFinalReport] = useState<FinalSolutionReport | null>(null);
  
  // Step 5 data
  const [issueResolved, setIssueResolved] = useState<boolean | null>(null);
  const [alternativeSolutions, setAlternativeSolutions] = useState<string | null>(null);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDevicePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep1Analysis = async () => {
    if (!deviceName.trim() || !devicePhoto) {
      toast.error(getTranslation('pleaseProvideDeviceNameAndPhoto', selectedLanguage));
      return;
    }

    setLoading(true);
    try {
      // Convert photo to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(devicePhoto);
      });

      // Step 1a: Name Analysis
      const { data: nameData, error: nameError } = await supabase.functions.invoke('analyze-device-name', {
        body: { deviceName, language: selectedLanguage }
      });

      if (nameError) throw nameError;
      setNameAnalysis(nameData);

      // Step 1b: Photo Analysis
      const { data: photoData, error: photoError } = await supabase.functions.invoke('analyze-device-photo', {
        body: { 
          imageBase64: base64.split(',')[1], 
          deviceName,
          commonProblems: nameData.commonProblems,
          language: selectedLanguage 
        }
      });

      if (photoError) throw photoError;
      setPhotoAnalysis(photoData);

      setCurrentStep(2);
    } catch (error) {
      console.error('Step 1 analysis error:', error);
      toast.error(getTranslation('analysisError', selectedLanguage));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Analysis = async () => {
    if (!userDescription.trim()) {
      toast.error(getTranslation('pleaseProvideDescription', selectedLanguage));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-description', {
        body: {
          description: userDescription,
          nameAnalysis,
          photoAnalysis,
          language: selectedLanguage
        }
      });

      if (error) throw error;
      setDescriptionAnalysis(data);
      setCurrentStep(3);
    } catch (error) {
      console.error('Step 2 analysis error:', error);
      toast.error(getTranslation('analysisError', selectedLanguage));
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Questions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          nameAnalysis,
          photoAnalysis,
          descriptionAnalysis,
          language: selectedLanguage
        }
      });

      if (error) throw error;
      setClarifyingQuestions(data.questions);
      setCurrentStep(4);
    } catch (error) {
      console.error('Step 3 questions error:', error);
      toast.error(getTranslation('analysisError', selectedLanguage));
    } finally {
      setLoading(false);
    }
  };

  const handleStep4FinalReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-final-report', {
        body: {
          deviceName,
          nameAnalysis,
          photoAnalysis,
          descriptionAnalysis,
          questionAnswers,
          language: selectedLanguage
        }
      });

      if (error) throw error;
      setFinalReport(data);
      setCurrentStep(5);
    } catch (error) {
      console.error('Step 4 final report error:', error);
      toast.error(getTranslation('analysisError', selectedLanguage));
    } finally {
      setLoading(false);
    }
  };

  const handleStep5Confirmation = async (resolved: boolean) => {
    setIssueResolved(resolved);
    
    if (!resolved) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-alternatives', {
          body: {
            deviceName,
            nameAnalysis,
            photoAnalysis,
            descriptionAnalysis,
            questionAnswers,
            currentSolution: finalReport,
            language: selectedLanguage
          }
        });

        if (error) throw error;
        setAlternativeSolutions(data.alternatives);
      } catch (error) {
        console.error('Alternative solutions error:', error);
        toast.error(getTranslation('analysisError', selectedLanguage));
      } finally {
        setLoading(false);
      }
    }
  };

  const resetDiagnostic = () => {
    setCurrentStep(1);
    setDeviceName('');
    setDevicePhoto(null);
    setPhotoPreview(null);
    setNameAnalysis(null);
    setPhotoAnalysis(null);
    setUserDescription('');
    setDescriptionAnalysis(null);
    setClarifyingQuestions([]);
    setQuestionAnswers({});
    setFinalReport(null);
    setIssueResolved(null);
    setAlternativeSolutions(null);
  };

  const getStepTitle = (step: number) => {
    const titles = [
      '',
      getTranslation('deviceInput', selectedLanguage),
      getTranslation('descriptionAnalysis', selectedLanguage),
      getTranslation('clarifyingQuestions', selectedLanguage),
      getTranslation('finalSolution', selectedLanguage),
      getTranslation('confirmation', selectedLanguage)
    ];
    return titles[step] || '';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{getTranslation('step', selectedLanguage)} {currentStep} {getTranslation('of', selectedLanguage)} 5</span>
          <span>{Math.round((currentStep / 5) * 100)}%</span>
        </div>
        <Progress value={(currentStep / 5) * 100} className="h-2" />
      </div>

      {/* Step 1: Device Input */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {getStepTitle(1)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deviceName">{getTranslation('deviceName', selectedLanguage)}</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={getTranslation('enterDeviceName', selectedLanguage)}
              />
            </div>
            
            <div>
              <Label htmlFor="devicePhoto">{getTranslation('devicePhoto', selectedLanguage)}</Label>
              <Input
                id="devicePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
              />
              {photoPreview && (
                <img 
                  src={photoPreview} 
                  alt="Device preview" 
                  className="mt-2 max-w-full h-48 object-cover rounded-lg"
                />
              )}
            </div>

            {nameAnalysis && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{getTranslation('nameAnalysis', selectedLanguage)}</h4>
                <p><strong>{getTranslation('deviceCategory', selectedLanguage)}:</strong> {nameAnalysis.deviceCategory}</p>
                <p><strong>{getTranslation('commonProblems', selectedLanguage)}:</strong></p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {nameAnalysis.commonProblems.map((problem, index) => (
                    <Badge key={index} variant="secondary">{problem}</Badge>
                  ))}
                </div>
              </div>
            )}

            {photoAnalysis && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{getTranslation('photoAnalysis', selectedLanguage)}</h4>
                <p><strong>{getTranslation('damageAssessment', selectedLanguage)}:</strong> {photoAnalysis.damageAssessment}</p>
                {photoAnalysis.visibleDamage.length > 0 && (
                  <>
                    <p><strong>{getTranslation('visibleDamage', selectedLanguage)}:</strong></p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {photoAnalysis.visibleDamage.map((damage, index) => (
                        <Badge key={index} variant="destructive">{damage}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <Button 
              onClick={handleStep1Analysis}
              disabled={loading || !deviceName.trim() || !devicePhoto}
              className="w-full"
            >
              {loading ? getTranslation('analyzing', selectedLanguage) : getTranslation('analyzeDevice', selectedLanguage)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Description Analysis */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {getStepTitle(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">{getTranslation('describeIssue', selectedLanguage)}</Label>
              <Textarea
                id="description"
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder={getTranslation('describeIssuePlaceholder', selectedLanguage)}
                rows={4}
              />
            </div>

            {descriptionAnalysis && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{getTranslation('analysisResults', selectedLanguage)}</h4>
                <p><strong>{getTranslation('prioritizedProblems', selectedLanguage)}:</strong></p>
                <div className="flex flex-wrap gap-1 mt-1 mb-2">
                  {descriptionAnalysis.prioritizedProblems.map((problem, index) => (
                    <Badge key={index} variant="default">{problem}</Badge>
                  ))}
                </div>
                <p><strong>{getTranslation('matchedKeywords', selectedLanguage)}:</strong></p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {descriptionAnalysis.matchedKeywords.map((keyword, index) => (
                    <Badge key={index} variant="outline">{keyword}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={handleStep2Analysis}
              disabled={loading || !userDescription.trim()}
              className="w-full"
            >
              {loading ? getTranslation('analyzing', selectedLanguage) : getTranslation('analyzeDescription', selectedLanguage)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Clarifying Questions */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {getStepTitle(3)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {getTranslation('questionsOptionalNote', selectedLanguage)}
              </p>
            </div>

            {clarifyingQuestions.length === 0 && (
              <Button 
                onClick={handleStep3Questions}
                disabled={loading}
                className="w-full"
              >
                {loading ? getTranslation('generating', selectedLanguage) : getTranslation('generateQuestions', selectedLanguage)}
              </Button>
            )}

            {clarifyingQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  <Badge variant="outline" className="mr-2">{question.category}</Badge>
                  {question.question}
                </Label>
                <Textarea
                  value={questionAnswers[question.id] || ''}
                  onChange={(e) => setQuestionAnswers(prev => ({
                    ...prev,
                    [question.id]: e.target.value
                  }))}
                  placeholder={getTranslation('optionalAnswer', selectedLanguage)}
                  rows={2}
                />
              </div>
            ))}

            {clarifyingQuestions.length > 0 && (
              <Button 
                onClick={handleStep4FinalReport}
                disabled={loading}
                className="w-full"
              >
                {loading ? getTranslation('generating', selectedLanguage) : getTranslation('generateSolution', selectedLanguage)}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Final Solution Report */}
      {currentStep === 4 && finalReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {getStepTitle(4)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  {getTranslation('likelyProblem', selectedLanguage)}
                </h4>
                <p className="text-red-700 dark:text-red-300">{finalReport.likelyProblem}</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  {getTranslation('reason', selectedLanguage)}
                </h4>
                <p className="text-amber-700 dark:text-amber-300">{finalReport.reason}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {getTranslation('repairSolution', selectedLanguage)}
                </h4>
                <ol className="text-green-700 dark:text-green-300 space-y-1">
                  {finalReport.repairSolution.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-semibold">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    {getTranslation('toolsNeeded', selectedLanguage)}
                  </h4>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                    {finalReport.toolsNeeded.map((tool, index) => (
                      <li key={index}>• {tool}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {getTranslation('estimatedCost', selectedLanguage)}
                  </h4>
                  <p className="text-purple-700 dark:text-purple-300">{finalReport.estimatedCost}</p>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  {getTranslation('extraTip', selectedLanguage)}
                </h4>
                <p className="text-orange-700 dark:text-orange-300">{finalReport.extraTip}</p>
              </div>

              {finalReport.alternativeProblems && (
                <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    {getTranslation('alternativeProblems', selectedLanguage)}
                  </h4>
                  {finalReport.alternativeProblems.map((alt, index) => (
                    <div key={index} className="mb-2">
                      <p className="font-medium text-gray-700 dark:text-gray-300">{alt.problem}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{alt.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={() => setCurrentStep(5)}
              className="w-full"
            >
              {getTranslation('proceedToConfirmation', selectedLanguage)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirmation Check */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {getStepTitle(5)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {issueResolved === null && (
              <div className="space-y-4">
                <p className="text-lg font-medium">
                  {getTranslation('didThisSolveIssue', selectedLanguage)}
                </p>
                <div className="flex gap-4">
                  <Button 
                    onClick={() => handleStep5Confirmation(true)}
                    variant="default"
                    className="flex-1"
                  >
                    {getTranslation('yes', selectedLanguage)}
                  </Button>
                  <Button 
                    onClick={() => handleStep5Confirmation(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    {getTranslation('no', selectedLanguage)}
                  </Button>
                </div>
              </div>
            )}

            {issueResolved === true && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 dark:bg-green-950 p-6 rounded-lg">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                    {getTranslation('successTitle', selectedLanguage)}
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {getTranslation('successMessage', selectedLanguage)}
                  </p>
                </div>
                <Button onClick={resetDiagnostic} variant="outline">
                  {getTranslation('startNewDiagnostic', selectedLanguage)}
                </Button>
              </div>
            )}

            {issueResolved === false && (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    {getTranslation('alternativeSolutions', selectedLanguage)}
                  </h4>
                  {loading ? (
                    <p className="text-amber-700 dark:text-amber-300">
                      {getTranslation('generatingAlternatives', selectedLanguage)}
                    </p>
                  ) : alternativeSolutions ? (
                    <div className="text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                      {alternativeSolutions}
                    </div>
                  ) : null}
                </div>
                <Button onClick={resetDiagnostic} variant="outline" className="w-full">
                  {getTranslation('startNewDiagnostic', selectedLanguage)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}