import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, AlertTriangle, Hammer, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiagnosisData {
  problem: string;
  repairSteps: string[];
  toolsNeeded: string[];
  preventionTip: string;
}

const DiagnosisResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { diagnosis, language, uiText } = location.state || {};

  const handleNewDiagnosis = () => {
    navigate('/scan');
  };

  if (!diagnosis) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader onRefresh={() => window.location.reload()} />
        <main className="px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">No diagnosis data available.</p>
                <Button onClick={handleNewDiagnosis} className="w-full mt-4">
                  Start New Diagnosis
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={() => window.location.reload()} />
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {uiText?.step4Title || 'Diagnosis & Repair Guide'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem with Reason */}
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {uiText?.problemIdentified || 'Problem Identified'}
                </h4>
                <p className="text-red-700 dark:text-red-300">
                  {diagnosis?.problem || (uiText?.awaitingDiagnosis || 'Awaiting diagnosis...')}
                </p>
              </div>

              {/* Repair Steps with Safety Tips */}
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {uiText?.repairSteps || 'Detailed Repair Steps'}
                </h4>
                {diagnosis?.repairSteps && diagnosis.repairSteps.length > 0 ? (
                  <ol className="text-green-700 dark:text-green-300 space-y-2">
                    {diagnosis.repairSteps.map((step: string, index: number) => (
                      <li key={index} className="flex gap-2">
                        <span className="font-semibold">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-green-700 dark:text-green-300">
                    {uiText?.awaitingDiagnosis || 'Awaiting diagnosis...'}
                  </p>
                )}
              </div>

              {/* Tools Needed */}
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                  <Hammer className="h-4 w-4" />
                  {uiText?.toolsNeeded || 'Tools Needed'}
                </h4>
                {diagnosis?.toolsNeeded && diagnosis.toolsNeeded.length > 0 ? (
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                    {diagnosis.toolsNeeded.map((tool: string, index: number) => (
                      <li key={index}>• {tool}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-700 dark:text-yellow-300">
                    {uiText?.awaitingDiagnosis || 'Awaiting diagnosis...'}
                  </p>
                )}
              </div>

              {/* Prevention Tip */}
              <div className="bg-cyan-50 dark:bg-cyan-950 p-4 rounded-lg">
                <h4 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  {uiText?.preventionTip || 'Prevention Tip'}
                </h4>
                <p className="text-cyan-700 dark:text-cyan-300">
                  {diagnosis?.preventionTip || (uiText?.awaitingDiagnosis || 'Awaiting diagnosis...')}
                </p>
              </div>

              <Button onClick={handleNewDiagnosis} className="w-full">
                {uiText?.startNewDiagnosis || 'Start New Diagnosis'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default DiagnosisResult;