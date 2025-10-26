import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, FileText, AlertTriangle, Hammer, DollarSign, Lightbulb, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosisData {
  problem: string;
  repairSteps: string[];
  toolsNeeded: string[];
  preventionTip: string;
}

const TranslatedDiagnosisResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { finalDiagnosis, selectedLanguage } = location.state || {};
  const [translatedDiagnosis, setTranslatedDiagnosis] = useState<DiagnosisData | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);

  const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    if (targetLanguage === 'en') return text;
    
    try {
      const { data, error } = await supabase.functions.invoke('gemini-translate', {
        body: { text, targetLanguage }
      });
      
      if (error) throw error;
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const translateDiagnosis = async () => {
      if (!finalDiagnosis || selectedLanguage === 'en') {
        setTranslatedDiagnosis(finalDiagnosis);
        return;
      }

      setIsTranslating(true);
      setTranslationError(false);

      try {
        const [translatedProblem, translatedRepairSteps, translatedToolsNeeded, translatedPreventionTip] = await Promise.all([
          translateText(finalDiagnosis.problem, selectedLanguage),
          Promise.all(finalDiagnosis.repairSteps.map((step: string) => translateText(step, selectedLanguage))),
          Promise.all(finalDiagnosis.toolsNeeded.map((tool: string) => translateText(tool, selectedLanguage))),
          translateText(finalDiagnosis.preventionTip, selectedLanguage)
        ]);

        setTranslatedDiagnosis({
          problem: translatedProblem,
          repairSteps: translatedRepairSteps,
          toolsNeeded: translatedToolsNeeded,
          preventionTip: translatedPreventionTip
        });
      } catch (error) {
        console.error('Translation failed:', error);
        setTranslationError(true);
        setTranslatedDiagnosis(finalDiagnosis); // Fallback to English
        toast.error('Translation not available, showing English result.');
      } finally {
        setIsTranslating(false);
      }
    };

    translateDiagnosis();
  }, [finalDiagnosis, selectedLanguage]);

  const handleNewDiagnosis = () => {
    navigate('/scan');
  };

  const handleSaveDiagnosis = () => {
    if (displayDiagnosis) {
      const savedDiagnoses = JSON.parse(localStorage.getItem('savedDiagnoses') || '[]');
      const newDiagnosis = { ...displayDiagnosis, savedAt: new Date().toISOString() };
      localStorage.setItem('savedDiagnoses', JSON.stringify([...savedDiagnoses, newDiagnosis]));
      toast.success('Diagnosis saved successfully!');
    } else {
      toast.error('No diagnosis to save.');
    }
  };

  const displayDiagnosis = translatedDiagnosis || finalDiagnosis;

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Diagnosis & Repair Guide
                {isTranslating && (
                  <span className="text-sm text-muted-foreground">Translating...</span>
                )}
                {translationError && (
                  <span className="text-sm text-orange-500">(English)</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveDiagnosis}
                  className="ml-auto"
                  title="Save Diagnosis"
                >
                  <BookmarkPlus className="h-5 w-5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem with Reason */}
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Problem Identified
                </h4>
                <p className="text-red-700 dark:text-red-300">
                  {displayDiagnosis?.problem || 'Awaiting diagnosis...'}
                </p>
              </div>

              {/* Repair Steps with Safety Tips */}
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Detailed Repair Steps
                </h4>
                {displayDiagnosis?.repairSteps && displayDiagnosis.repairSteps.length > 0 ? (
                  <ol className="text-green-700 dark:text-green-300 space-y-2">
                    {displayDiagnosis.repairSteps.map((step: string, index: number) => (
                      <li key={index} className="flex gap-2">
                        <span className="font-semibold">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-green-700 dark:text-green-300">Awaiting diagnosis...</p>
                )}
              </div>

              {/* Tools Needed */}
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                  <Hammer className="h-4 w-4" />
                  Tools Needed
                </h4>
                {displayDiagnosis?.toolsNeeded && displayDiagnosis.toolsNeeded.length > 0 ? (
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                    {displayDiagnosis.toolsNeeded.map((tool: string, index: number) => (
                      <li key={index}>• {tool}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-700 dark:text-yellow-300">Awaiting diagnosis...</p>
                )}
              </div>

              {/* Prevention Tip */}
              <div className="bg-cyan-50 dark:bg-cyan-950 p-4 rounded-lg">
                <h4 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Prevention Tip
                </h4>
                <p className="text-cyan-700 dark:text-cyan-300">
                  {displayDiagnosis?.preventionTip || 'Awaiting diagnosis...'}
                </p>
              </div>

              <Button onClick={handleNewDiagnosis} className="w-full">
                Start New Diagnosis
              </Button>
              <Button onClick={() => navigate('/repair-bot', { state: { diagnosisDetails: displayDiagnosis } })} className="w-full mt-2">
                Chat with AI for more
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default TranslatedDiagnosisResult;