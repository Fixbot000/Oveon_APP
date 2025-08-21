import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Wrench, 
  Shield,
  Database,
  Search,
  Brain,
  Clock,
  Zap
} from 'lucide-react';

interface DiagnosticSession {
  id: string;
  status: 'analyzing' | 'completed' | 'failed';
  aiAnalysis?: {
    diagnosis: any;
    source: string;
  };
}

interface DiagnosticResultsProps {
  session: DiagnosticSession;
  onStartNew: () => void;
}

export const DiagnosticResults: React.FC<DiagnosticResultsProps> = ({ session, onStartNew }) => {
  const diagnosis = session.aiAnalysis?.diagnosis;
  const source = session.aiAnalysis?.source;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'professional': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gemini_direct': return <Brain className="w-4 h-4 text-purple-600" />;
      case 'database': return <Database className="w-4 h-4 text-blue-600" />;
      case 'gemini_search': return <Search className="w-4 h-4 text-green-600" />;
      case 'chatgpt_fallback': return <Zap className="w-4 h-4 text-orange-600" />;
      case 'guaranteed_fallback': return <Shield className="w-4 h-4 text-gray-600" />;
      default: return <Wrench className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'gemini_direct': return 'Gemini AI Direct Analysis';
      case 'database': return 'Database Match Found';
      case 'gemini_search': return 'Gemini AI + Web Search';
      case 'chatgpt_fallback': return 'ChatGPT Fallback Analysis';
      case 'guaranteed_fallback': return 'Guaranteed Fallback';
      case 'emergency_fallback': return 'Emergency Fallback';
      default: return 'AI Analysis';
    }
  };

  const getSourceDescription = (source: string) => {
    switch (source) {
      case 'gemini_direct': return 'Gemini AI analyzed your images and description directly';
      case 'database': return 'Found matching case in our repair database';
      case 'gemini_search': return 'Gemini AI processed web search results for your issue';
      case 'chatgpt_fallback': return 'ChatGPT analyzed web search results as fallback';
      case 'guaranteed_fallback': return 'Provided guaranteed diagnosis when other methods failed';
      case 'emergency_fallback': return 'Emergency diagnosis to ensure you always get help';
      default: return 'AI-powered diagnosis completed';
    }
  };

  if (!diagnosis) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No diagnosis available</p>
          <Button onClick={onStartNew}>
            Start New Diagnosis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Diagnosis Results</h1>
        <Button onClick={onStartNew} variant="outline">
          Start New Diagnosis
        </Button>
      </div>

      {/* Source Information */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getSourceIcon(source)}
            {getSourceLabel(source)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{getSourceDescription(source)}</p>
        </CardContent>
      </Card>

      {/* Main Problem Identification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Identified Problem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-xl font-semibold mb-3 text-red-600">{diagnosis.problem}</h3>
          <p className="text-muted-foreground leading-relaxed">{diagnosis.explanation}</p>
        </CardContent>
      </Card>

      {/* Repair Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-4 h-4" />
              Difficulty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${getDifficultyColor(diagnosis.difficulty || 'Unknown')} border`}>
              {diagnosis.difficulty || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4" />
              Time Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{diagnosis.timeRequired || 'Unknown'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Estimated Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{diagnosis.estimatedCost || 'Contact technician for quote'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      {diagnosis.successRate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-green-600">{diagnosis.successRate}</div>
              <p className="text-sm text-muted-foreground">
                Expected success rate for this repair based on similar cases
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Warnings */}
      {diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong className="text-orange-800">Safety Warnings:</strong>
            <ul className="list-disc list-inside mt-2 text-orange-700">
              {diagnosis.safetyWarnings.map((warning: string, index: number) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tools Needed */}
      {diagnosis.toolsNeeded && diagnosis.toolsNeeded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Required Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {diagnosis.toolsNeeded.map((tool: string, index: number) => (
                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {tool}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repair Steps */}
      {diagnosis.repairSteps && diagnosis.repairSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step-by-Step Repair Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {diagnosis.repairSteps.map((step: string, index: number) => (
                <div key={index} className="flex gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="flex-1 pt-1">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Help Recommendation */}
      {(diagnosis.difficulty === 'Professional' || diagnosis.difficulty === 'Advanced') && (
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong className="text-red-800">Professional Help Recommended:</strong>
            <p className="text-red-700 mt-1">
              This repair requires {diagnosis.difficulty.toLowerCase()} skills and specialized tools. 
              Consider consulting a qualified technician to avoid damage, injury, or safety risks.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Fallback Notice */}
      {(source === 'guaranteed_fallback' || source === 'emergency_fallback') && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong className="text-yellow-800">Note:</strong>
            <p className="text-yellow-700 mt-1">
              This diagnosis was generated using fallback methods. For the most accurate results, 
              consider providing more detailed information or consulting a professional technician.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <p className="font-medium">
              Diagnosis completed successfully! The AI pipeline provided you with a comprehensive analysis 
              and repair guidance. Good luck with your repair!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};