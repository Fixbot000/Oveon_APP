import React, { useRef, useState } from 'react';
import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const IdentifyKnowUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ analysis: string; questions: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      console.log("Selected file:", file.name);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleProceed = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use this feature.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!imagePreview) {
      toast({
        title: "No Image to Analyze",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      console.log("Attempting to invoke Supabase function 'identify-components'...");
      const response = await supabase.functions.invoke('identify-components', {
        body: JSON.stringify({
          imageBase64: imagePreview,
          deviceName: "electronic component", // or allow user to input
          language: "en", // or get from user settings
        }),
      });
      console.log("Supabase function invocation response:", response);

      if (response.data && response.data.overallSuggestion) {
        const identifiedQuestions = (response.data.components || []).map((comp: { name: string; }) => `Identified component: ${comp.name}`);

        setAnalysisResult({
          analysis: response.data.overallSuggestion,
          questions: identifiedQuestions,
        });
      } else if (response.error) {
        throw new Error(response.error.message);
      } else {
        console.error("Supabase function response data:", response.data);
        throw new Error("Unexpected response format from analysis function. Missing 'overallSuggestion'.");
      }
    } catch (error: any) {
      console.error("Error invoking Supabase function:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center p-4 bg-muted rounded-md">
              <svg className="animate-spin h-5 w-5 mr-3 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-muted-foreground">Analyzing image...</p>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5" />
                Identify and Know
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-primary/50 rounded-lg text-center bg-primary/5">
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="h-12 w-12 text-primary mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">Tap to Upload Photo</p>
                <Button variant="outline" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleButtonClick}>
                  Browse Files
                </Button>
              </label>
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} accept="image/*" />
              <p className="text-xs text-muted-foreground mt-2">Supports JPG, PNG, WEBP, GIF</p>

              {imagePreview && (
                <div className="mt-6 w-full max-w-sm flex flex-col items-center p-4 bg-background rounded-lg shadow-md">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto rounded-lg object-contain mb-4 border border-border" />
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setImagePreview(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleProceed} disabled={isLoading}>
                      {isLoading ? "Analyzing..." : "Proceed"}
                    </Button>
                  </div>
                </div>
              )}

              {analysisResult && (
                <Card className="w-full mt-6 text-left">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Analysis Result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">{analysisResult.analysis}</p>
                      {analysisResult.questions.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-base font-semibold text-foreground">Follow-up Questions:</h3>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {analysisResult.questions.map((question, index) => (
                              <li key={index}>{question}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default IdentifyKnowUpload;
