import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  ExternalLink, 
  Shield, 
  Wrench, 
  Zap,
  Search,
  Database,
  Brain
} from 'lucide-react';

interface DiagnosticSession {
  id: string;
  status: 'analyzing' | 'completed' | 'failed';
  aiAnalysis?: any;
  databaseMatches?: any[];
  repairGuidance?: any;
  backupSearchResults?: any;
}

interface DiagnosticResultsProps {
  session: DiagnosticSession;
  onStartNew: () => void;
}

export const DiagnosticResults: React.FC<DiagnosticResultsProps> = ({ session, onStartNew }) => {
  const { aiAnalysis, databaseMatches, repairGuidance, backupSearchResults } = session;

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSkillColor = (skill: string) => {
    switch (skill?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'professional': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Diagnostic Results</h1>
        <Button onClick={onStartNew} variant="outline">
          Start New Diagnosis
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="matches">Database</TabsTrigger>
          <TabsTrigger value="repair">Repair Guide</TabsTrigger>
          <TabsTrigger value="search">External</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Device Identified</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiAnalysis?.deviceType || 'Unknown'}</div>
                <p className="text-xs text-muted-foreground">
                  Confidence: {Math.round((aiAnalysis?.confidence || 0) * 100)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Matches</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{databaseMatches?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Best match: {Math.round((databaseMatches?.[0]?.confidence || 0) * 100)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Repair Difficulty</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge className={getSkillColor(repairGuidance?.skillLevel || 'unknown')}>
                  {repairGuidance?.skillLevel || 'Unknown'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Est. time: {repairGuidance?.estimatedTime || 'Unknown'}
                </p>
              </CardContent>
            </Card>
          </div>

          {repairGuidance?.diagnosis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{repairGuidance.diagnosis}</p>
              </CardContent>
            </Card>
          )}

          {repairGuidance?.safetyWarnings && repairGuidance.safetyWarnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Safety Warnings:</strong>
                <ul className="list-disc list-inside mt-2">
                  {repairGuidance.safetyWarnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {aiAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>AI Vision Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Device Information</h4>
                  <p><strong>Type:</strong> {aiAnalysis.deviceType}</p>
                  <p><strong>Condition:</strong> {aiAnalysis.condition}</p>
                  <p><strong>Confidence:</strong> {Math.round((aiAnalysis.confidence || 0) * 100)}%</p>
                </div>

                {aiAnalysis.specifications && Object.keys(aiAnalysis.specifications).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Specifications</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      {Object.entries(aiAnalysis.specifications).map(([key, value]) => (
                        value && <p key={key}><strong>{key}:</strong> {value as string}</p>
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.visibleIssues && aiAnalysis.visibleIssues.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Visible Issues</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiAnalysis.visibleIssues.map((issue: string, index: number) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.potentialCauses && aiAnalysis.potentialCauses.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Potential Causes</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiAnalysis.potentialCauses.map((cause: string, index: number) => (
                        <li key={index}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          {databaseMatches && databaseMatches.length > 0 ? (
            databaseMatches.map((match, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Match #{index + 1}</span>
                    <Badge variant="secondary">
                      {Math.round(match.confidence * 100)}% match
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(match.record).map(([key, value]) => (
                      key !== 'id' && value && (
                        <p key={key}>
                          <strong>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {value as string}
                        </p>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No database matches found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="repair" className="space-y-4">
          {repairGuidance ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Repair Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Skill Level:</span>
                      <Badge className={getSkillColor(repairGuidance.skillLevel)}>
                        {repairGuidance.skillLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Level:</span>
                      <span className={getRiskColor(repairGuidance.riskLevel)}>
                        {repairGuidance.riskLevel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span>{Math.round((repairGuidance.successRate || 0) * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Time:</span>
                      <span>{repairGuidance.estimatedTime}</span>
                    </div>
                  </CardContent>
                </Card>

                {repairGuidance.costEstimate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Cost Estimate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Parts:</span>
                        <span>
                          ${repairGuidance.costEstimate.partsMin}-${repairGuidance.costEstimate.partsMax}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Labor:</span>
                        <span>{repairGuidance.costEstimate.laborHours}h</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {repairGuidance.requiredTools && repairGuidance.requiredTools.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Required Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {repairGuidance.requiredTools.map((tool: string, index: number) => (
                        <li key={index}>{tool}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {repairGuidance.repairSteps && repairGuidance.repairSteps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Repair Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {repairGuidance.repairSteps.map((step: any, index: number) => (
                        <div key={index} className="border-l-4 border-primary pl-4">
                          <h4 className="font-semibold">Step {step.step}: {step.title}</h4>
                          <p className="text-muted-foreground mt-1">{step.description}</p>
                          
                          {step.warnings && step.warnings.length > 0 && (
                            <Alert className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <ul className="list-disc list-inside">
                                  {step.warnings.map((warning: string, wIndex: number) => (
                                    <li key={wIndex}>{warning}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {step.tips && step.tips.length > 0 && (
                            <div className="mt-2 bg-blue-50 p-2 rounded-lg">
                              <p className="text-sm font-medium text-blue-800">Tips:</p>
                              <ul className="list-disc list-inside text-sm text-blue-700">
                                {step.tips.map((tip: string, tIndex: number) => (
                                  <li key={tIndex}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {repairGuidance.whenToSeekProfessional && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>When to seek professional help:</strong> {repairGuidance.whenToSeekProfessional}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No repair guidance available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          {backupSearchResults && backupSearchResults.results?.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    External Search Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Search query: "{backupSearchResults.searchQuery}"
                  </p>
                  <div className="space-y-3">
                    {backupSearchResults.results.map((result: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-600 hover:text-blue-800">
                              <a href={result.link} target="_blank" rel="noopener noreferrer">
                                {result.title}
                              </a>
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {result.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Relevance: {Math.round((result.relevanceScore || 0) * 100)}%
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No external search results available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};