import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

const CircuitGenerator: React.FC = () => {
  const [description, setDescription] = useState<string>('');
  const [circuitData, setCircuitData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const generateCircuit = async () => {
    setLoading(true);
    setError(null);
    setCircuitData(null);

    if (!description) {
      setError("Please enter a circuit description.");
      setLoading(false);
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error fetching session:", sessionError);
      setError("Authentication error: Could not retrieve user session.");
      setLoading(false);
      return;
    }

    if (!session) {
      setError("You must be logged in to generate a circuit.");
      setLoading(false);
      return;
    }

    const jwt = session.access_token;

    try {
      const response = await fetch('https://djxdbltjwqavzhpkrnzr.supabase.co/functions/v1/generateCircuit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'apikey': 'sb_publishable_-hCLsCohcSo-LpyiHMCqQ_NpcdapYz',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate circuit.');
      }

      const data = await response.json();
      if (data && data.result) {
        setCircuitData({
          circuitSummary: data.result["Circuit Summary"],
          componentsList: data.result["Components List"],
          connectionWorkingDetails: data.result["Connection/Working Details"],
          logicTable: data.result["Logic Table"],
          asciiDiagram: data.result["ASCII/Text-based Circuit Diagram"],
        });
      } else {
        setError("Unexpected response format.");
      }
    } catch (err: any) {
      console.error("Error during circuit generation fetch:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Circuit Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="circuitDescription">Describe Your Desired Circuit</Label>
              <Textarea
                id="circuitDescription"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., A simple LED circuit with a resistor and a 9V battery."
              />
            </div>
            <Button
              onClick={generateCircuit}
              disabled={loading || !description.trim()}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Circuit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {circuitData && (
        <div className="mt-4 space-y-4">
          {circuitData.circuitSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Circuit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{circuitData.circuitSummary}</p>
              </CardContent>
            </Card>
          )}
          {circuitData.componentsList && (
            <Card>
              <CardHeader>
                <CardTitle>Components List</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap">{circuitData.componentsList}</pre>
              </CardContent>
            </Card>
          )}
          {circuitData.connectionWorkingDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Connection/Working Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap">{circuitData.connectionWorkingDetails}</pre>
              </CardContent>
            </Card>
          )}
          {circuitData.logicTable && (
            <Card>
              <CardHeader>
                <CardTitle>Logic Table</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap">{circuitData.logicTable}</pre>
              </CardContent>
            </Card>
          )}
          {circuitData.asciiDiagram && (
            <Card>
              <CardHeader>
                <CardTitle>Circuit Diagram</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-sm">{circuitData.asciiDiagram}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CircuitGenerator;
