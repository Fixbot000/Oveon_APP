import React from 'react';
import { useLocation } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, FileText, AlertTriangle, Hammer, DollarSign, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DiagnosisResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { finalSolution } = location.state || {};

  const handleNewDiagnosis = () => {
    navigate('/scan');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} onRefresh={() => window.location.reload()} />
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Diagnosis & Repair Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem */}
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Problem Identified
                </h4>
                <p className="text-red-700 dark:text-red-300">
                  {finalSolution?.problem || 'Awaiting diagnosis...'}
                </p>
              </div>

              {/* Reason */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Reason
                </h4>
                <p className="text-blue-700 dark:text-blue-300">
                  {finalSolution?.reason || 'Awaiting diagnosis...'}
                </p>
              </div>

              {/* Repair Steps */}
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Detailed Repair Steps
                </h4>
                {finalSolution?.solution_steps && finalSolution.solution_steps.length > 0 ? (
                  <ol className="text-green-700 dark:text-green-300 space-y-2">
                    {finalSolution.solution_steps.map((step: string, index: number) => (
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

              {/* Tools Required */}
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                  <Hammer className="h-4 w-4" />
                  Tools Required
                </h4>
                {finalSolution?.tools_required && finalSolution.tools_required.length > 0 ? (
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                    {finalSolution.tools_required.map((tool: string, index: number) => (
                      <li key={index}>{tool}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-700 dark:text-yellow-300">Awaiting diagnosis...</p>
                )}
              </div>

              {/* Estimated Cost */}
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Estimated Cost
                </h4>
                <p className="text-purple-700 dark:text-purple-300">
                  {finalSolution?.estimated_cost || 'Awaiting diagnosis...'}
                </p>
              </div>

              {/* Tip */}
              <div className="bg-cyan-50 dark:bg-cyan-950 p-4 rounded-lg">
                <h4 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Tip
                </h4>
                <p className="text-cyan-700 dark:text-cyan-300">
                  {finalSolution?.tip || 'Awaiting diagnosis...'}
                </p>
              </div>

              <Button onClick={handleNewDiagnosis} className="w-full">
                Start New Diagnosis
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
