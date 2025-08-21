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
  ExternalLink
} from 'lucide-react';

interface DiagnosticSession {
  id: string;
  status: 'analyzing' | 'completed' | 'failed';
  aiAnalysis?: any;
}

interface DiagnosticResultsProps {
  session: DiagnosticSession;
  onStartNew: () => void;
}

export const DiagnosticResults: React.FC<DiagnosticResultsProps> = ({ session, onStartNew }) => {
  const diagnosis = session.aiAnalysis?.diagnosis;
  const source = session.aiAnalysis?.source;
  const confidence = session.aiAnalysis?.confidence;
  const databaseMatches = session.aiAnalysis?.databaseMatches;
  const searchResults = session.aiAnalysis?.searchResults;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'professional': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'database': return <Database className="w-4 h-4" />;
      case 'gemini_search': return <Brain className="w-4 h-4" />;
      case 'chatgpt_search': return <Search className="w-4 h-4" />;
      default: return <Wrench className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'database': return 'Database Match';
      case 'gemini_search': return 'Gemini AI + Search';
      case 'chatgpt_search': return 'ChatGPT + Search';
      case 'fallback': return 'Fallback Analysis';
      default: return 'AI Analysis';
    }
  };

  if (!diagnosis) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No diagnosis available</p>
          <Button onClick={onStartNew} className="mt-4">
            Start New Diagnosis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Diagnostic Results</h1>
        <Button onClick={onStartNew} variant="outline">
          Start New Diagnosis
        </Button>
      </div>

      {/* Source and Confidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getSourceIcon(source)}
            Analysis Source: {getSourceLabel(source)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Confidence: </span>
              <Badge variant={confidence === 'high' ? 'default' : confidence === 'medium' ? 'secondary' : 'outline'}>
                {confidence || 'Unknown'}
              </Badge>
            </div>
            {databaseMatches && databaseMatches.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Database matches: </span>
                <Badge variant="secondary">{databaseMatches.length}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Identified Problem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-xl font-semibold mb-3">{diagnosis.problem}</h3>
          <p className="text-muted-foreground">{diagnosis.explanation}</p>
        </CardContent>
      </Card>

      {/* Repair Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Repair Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Difficulty:</span>
              <Badge className={getDifficultyColor(diagnosis.difficulty || 'Unknown')}>
                {diagnosis.difficulty || 'Unknown'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Success Rate:</span>
              <span className="font-medium">{diagnosis.successRate || 'Unknown'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{diagnosis.estimatedCost || 'Contact technician for quote'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Safety Warnings */}
      {diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Safety Warnings:</strong>
            <ul className="list-disc list-inside mt-2">
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
                <Badge key={index} variant="outline">{tool}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repair Steps */}
      {diagnosis.repairSteps && diagnosis.repairSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Repair Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {diagnosis.repairSteps.map((step: string, index: number) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="flex-1">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Matches */}
      {databaseMatches && databaseMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Database Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {databaseMatches.slice(0, 2).map((match: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="space-y-1 text-sm">
                    {Object.entries(match).map(([key, value]) => (
                      key !== 'id' && value && (
                        <p key={key}>
                          <strong>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {value as string}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              External References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((result: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-600 hover:text-blue-800">
                        <a href={result.link} target="_blank" rel="noopener noreferrer">
                          {result.title}
                        </a>
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground ml-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Help Recommendation */}
      {(diagnosis.difficulty === 'Professional' || diagnosis.difficulty === 'Advanced') && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Professional Help Recommended:</strong> This repair requires advanced skills and specialized tools. 
            Consider consulting a qualified technician to avoid damage or safety risks.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};