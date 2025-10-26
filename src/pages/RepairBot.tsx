import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import MobileHeader from '@/components/MobileHeader';

interface DiagnosisData {
  problem: string;
  repairSteps: string[];
  toolsNeeded: string[];
  preventionTip: string;
}

const RepairBot = () => {
  const location = useLocation();
  const [diagnosisDetails, setDiagnosisDetails] = useState<DiagnosisData | null>(null);

  useEffect(() => {
    if (location.state && location.state.diagnosisDetails) {
      setDiagnosisDetails(location.state.diagnosisDetails);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* <MobileHeader title="Repair Bot" /> */}
      <main className="px-4 py-6 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Repair Bot Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnosisDetails ? (
                <div className="space-y-2">
                  <h3 className="font-semibold">Diagnosis Details:</h3>
                  <p><strong>Problem:</strong> {diagnosisDetails.problem}</p>
                  <p><strong>Repair Steps:</strong> {diagnosisDetails.repairSteps.join(', ')}</p>
                  <p><strong>Tools Needed:</strong> {diagnosisDetails.toolsNeeded.join(', ')}</p>
                  <p><strong>Prevention Tip:</strong> {diagnosisDetails.preventionTip}</p>
                </div>
              ) : (
                <p>No diagnosis details available. Please go back to the diagnosis result page.</p>
              )}
              <div className="border-t pt-4 mt-4">
                <p className="text-muted-foreground">This is where the AI chat interface will be integrated.</p>
                {/* Future: Integrate AI chat component here */}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default RepairBot;
