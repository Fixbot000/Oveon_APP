import React, { useState, useEffect } from 'react';
import { Clock, FileText, Calendar, ChevronRight, Bookmark } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Scan {
  id: string;
  device_name: string;
  result: string;
  created_at: string;
  updated_at: string;
}

interface SavedDiagnosisData {
  problem: string;
  repairSteps: string[];
  toolsNeeded: string[];
  preventionTip: string;
  savedAt: string;
}

const History = () => {
  const { user, isPremium } = useAuth(); // Destructure isPremium
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [savedDiagnoses, setSavedDiagnoses] = useState<SavedDiagnosisData[]>([]);
  const [selectedSavedDiagnosis, setSelectedSavedDiagnosis] = useState<SavedDiagnosisData | null>(null);
  const [activeTab, setActiveTab] = useState('scans'); // New state for active tab

  useEffect(() => {
    if (user) {
      fetchScans();
    } else {
      navigate('/auth');
    }
    loadSavedDiagnoses(); // Load saved diagnoses on component mount
  }, [user, navigate]);

  const loadSavedDiagnoses = () => {
    const storedDiagnoses = JSON.parse(localStorage.getItem('savedDiagnoses') || '[]');
    setSavedDiagnoses(storedDiagnoses);
  };

  const fetchScans = async () => {
    if (!user) {
      console.log('No user found, cannot fetch scans');
      setLoading(false);
      return;
    }

    console.log('Fetching scans for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      console.log('Scans query result:', { data, error });

      if (error) {
        console.error('Error fetching scans:', error);
        toast.error('Failed to fetch scan history');
      } else {
        setScans(data || []);
        console.log('Successfully loaded', data?.length || 0, 'scans');
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
      toast.error('Error loading scan history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getResultPreview = (result: string) => {
    const lines = result.split('\n').filter(line => line.trim());
    const firstIssue = lines.find(line => line.includes('•') || line.includes('-'));
    if (firstIssue) {
      return firstIssue.replace(/[•-]\s*/, '').slice(0, 60) + '...';
    }
    return result.slice(0, 60) + '...';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            History
          </h1>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
              <TabsTrigger value="scans" className="text-sm">Scan History</TabsTrigger>
              <TabsTrigger value="saved" className="text-sm">Saved Guides</TabsTrigger>
            </TabsList>
            <TabsContent value="scans">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : scans.length === 0 ? (
                <Card>
                  <CardHeader className="text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle>No scan history yet</CardTitle>
                    <CardDescription>
                      Your device scans will appear here once you start using the scanner.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => navigate('/scan')}
                      className="w-full"
                    >
                      Start Your First Scan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {scans.map((scan) => (
                    <Card
                      key={scan.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedScan(scan)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{scan.device_name}</h3>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(scan.updated_at)}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="saved">
              {savedDiagnoses.length === 0 ? (
                <Card>
                  <CardHeader className="text-center">
                    <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <CardTitle>No saved repair guides yet</CardTitle>
                    <CardDescription>
                      Saved repair guides will appear here. Save a diagnosis from the result page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => navigate('/scan')}
                      className="w-full"
                    >
                      Start New Diagnosis
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {savedDiagnoses.map((diagnosis, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedSavedDiagnosis(diagnosis)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{diagnosis.problem}</h3>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(diagnosis.savedAt)}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedScan?.device_name}
            </DialogTitle>
            <DialogDescription>
              Scanned on {selectedScan && formatDate(selectedScan.updated_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{selectedScan?.result}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Saved Diagnosis Details */}
      <Dialog open={!!selectedSavedDiagnosis} onOpenChange={() => setSelectedSavedDiagnosis(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              {selectedSavedDiagnosis?.problem}
            </DialogTitle>
            <DialogDescription>
              Saved on {selectedSavedDiagnosis && formatDate(selectedSavedDiagnosis.savedAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Problem:</h4>
              <p>{selectedSavedDiagnosis?.problem}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Repair Steps:</h4>
              <ol className="list-decimal list-inside">
                {selectedSavedDiagnosis?.repairSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Tools Needed:</h4>
              <ul className="list-disc list-inside">
                {selectedSavedDiagnosis?.toolsNeeded.map((tool, index) => (
                  <li key={index}>{tool}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Prevention Tip:</h4>
              <p>{selectedSavedDiagnosis?.preventionTip}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default History;