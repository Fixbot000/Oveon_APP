import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { 
  takePicture, 
  checkNetworkStatus, 
  retryRequest, 
  getDeviceInfo,
  isNativePlatform 
} from '@/utils/capacitorHelpers';

interface ScanResult {
  problems: string[];
  suggestions: string[];
  correctedCode?: string;
}

interface DiagnosisResult {
  problem: string;
  repairSteps: string[];
  toolsNeeded: string[];
  preventionTip: string;
}

export const useEnhancedScan = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Enhanced image capture with native camera support
  const captureImage = useCallback(async (): Promise<string> => {
    try {
      if (isNativePlatform()) {
        // Use Capacitor Camera for native apps
        return await takePicture();
      } else {
        // Fallback to web file input for browser
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment'; // Use rear camera by default
          
          input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            } else {
              reject(new Error('No file selected'));
            }
          };
          
          input.click();
        });
      }
    } catch (error) {
      console.error('Image capture error:', error);
      throw new Error('Failed to capture image. Please check camera permissions.');
    }
  }, []);

  // Enhanced API request with auth headers and retry logic
  const makeAuthenticatedRequest = useCallback(async (
    functionName: string,
    body: any,
    timeout: number = 30000
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get fresh session to ensure valid token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Authentication session expired. Please log in again.');
    }

    const deviceInfo = await getDeviceInfo();
    
    const requestWithTimeout = () => {
      return Promise.race([
        supabase.functions.invoke(functionName, {
          body: {
            ...body,
            deviceInfo: {
              platform: deviceInfo.platform,
              model: deviceInfo.model,
              osVersion: deviceInfo.osVersion
            }
          },
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);
    };

    return await retryRequest(requestWithTimeout as () => Promise<any>, 3, 2000);
  }, [user]);

  // Enhanced code analysis with better error handling
  const analyzeCode = useCallback(async (
    problemDescription: string,
    fileContent?: string,
    fileName?: string
  ): Promise<ScanResult> => {
    if (!problemDescription.trim() && !fileContent) {
      throw new Error('Please provide either a description or upload a file.');
    }

    setLoading(true);
    try {
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { data, error } = await makeAuthenticatedRequest('analyze-code-problem', {
        text: problemDescription || undefined,
        fileContent: fileContent || undefined,
        fileName: fileName || undefined,
      }, 45000); // 45 second timeout for code analysis

      if (error) {
        console.error('Code analysis error:', error);
        throw new Error(error.message || 'Failed to analyze code');
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      toast.success('Code analysis completed successfully!');
      return {
        problems: data.problems || [],
        suggestions: data.suggestions || [],
        correctedCode: data.correctedCode,
      };
    } catch (error) {
      console.error('Code analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to analyze code';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Enhanced device analysis with image processing
  const analyzeDevice = useCallback(async (
    deviceName: string,
    imageData: string,
    description: string,
    language: string = 'en'
  ): Promise<{ questions: { id: string; category: string; question: string }[] }> => {
    if (!deviceName.trim() || !imageData || !description.trim()) {
      throw new Error('Please provide device name, image, and description.');
    }

    setLoading(true);
    try {
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Extract base64 data from data URL
      const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;

      const { data, error } = await makeAuthenticatedRequest('analyze-device-and-generate-questions', {
        deviceName,
        imageBase64: base64Data,
        description,
        language,
      }, 60000); // 60 second timeout for image analysis

      if (error) {
        console.error('Device analysis error:', error);
        throw new Error(error.message || 'Failed to analyze device');
      }

      if (!data.questions) {
        throw new Error('No questions generated from analysis');
      }

      toast.success('Device analysis completed successfully!');
      return { questions: data.questions };
    } catch (error) {
      console.error('Device analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to analyze device';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  // Enhanced diagnosis generation
  const generateDiagnosis = useCallback(async (
    deviceName: string,
    description: string,
    questions: { id: string; category: string; question: string }[],
    answers: { [key: string]: string },
    language: string = 'en'
  ): Promise<DiagnosisResult> => {
    setLoading(true);
    try {
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { data, error } = await makeAuthenticatedRequest('generate-repair-diagnosis', {
        deviceName,
        description,
        questions,
        answers,
        language,
      }, 45000); // 45 second timeout for diagnosis

      if (error) {
        console.error('Diagnosis generation error:', error);
        throw new Error(error.message || 'Failed to generate diagnosis');
      }

      if (!data.problem || !data.repairSteps) {
        throw new Error('Incomplete diagnosis generated');
      }

      // Save to scan history
      try {
        const scanResult = JSON.stringify({
          problem: data.problem,
          repairSteps: data.repairSteps,
          toolsNeeded: data.toolsNeeded || [],
          preventionTip: data.preventionTip || '',
          timestamp: new Date().toISOString()
        });

        await supabase
          .from('scans')
          .insert({
            user_id: user?.id,
            device_name: deviceName,
            result: scanResult
          });
      } catch (saveError) {
        console.error('Failed to save scan to history:', saveError);
        // Don't fail the whole operation if history save fails
      }

      toast.success('Repair diagnosis generated successfully!');
      return {
        problem: data.problem,
        repairSteps: data.repairSteps,
        toolsNeeded: data.toolsNeeded || [],
        preventionTip: data.preventionTip || '',
      };
    } catch (error) {
      console.error('Diagnosis generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to generate diagnosis';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest, user]);

  return {
    loading,
    captureImage,
    analyzeCode,
    analyzeDevice,
    generateDiagnosis,
  };
};