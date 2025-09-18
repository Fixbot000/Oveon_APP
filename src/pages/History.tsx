import React, { useState } from 'react';
import { Clock, FileText, Calendar, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useScanHistory, ScanHistoryItem } from '@/hooks/useScanHistory';

const History = () => {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const { scans, loading, refreshScans, syncPendingScans } = useScanHistory();
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPendingScans();
      await refreshScans();
    } finally {
      setSyncing(false);
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

  const getResultPreview = (result: any) => {
    if (typeof result === 'string') {
      const lines = result.split('\n').filter(line => line.trim());
      const firstIssue = lines.find(line => line.includes('•') || line.includes('-'));
      if (firstIssue) {
        return firstIssue.replace(/[•-]\s*/, '').slice(0, 60) + '...';
      }
      return result.slice(0, 60) + '...';
    }
    
    // Handle JSON scan results
    if (result?.problem) {
      return result.problem.slice(0, 60) + '...';
    }
    
    return 'Scan completed - tap to view details';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        onRefresh={refreshScans} 
        isPremium={isPremium}
        showBackButton={true}
        backButtonTarget="/profile"
      />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Scan History
            </h1>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}
          </div>
          
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(scan.created_at)}
                            </Badge>
                            {scan.local_id && !scan.synced_at && (
                              <Badge variant="secondary" className="text-xs">
                                Local
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getResultPreview(scan.scan_result)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
              Scanned on {selectedScan && formatDate(selectedScan.created_at)}
              {selectedScan?.local_id && !selectedScan?.synced_at && " (Local)"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose prose-sm max-w-none">
              {typeof selectedScan?.scan_result === 'string' ? (
                <div className="whitespace-pre-wrap">{selectedScan.scan_result}</div>
              ) : (
                <div className="space-y-4">
                  {selectedScan?.scan_result?.problem && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Problem:</h4>
                      <p className="text-sm">{selectedScan.scan_result.problem}</p>
                    </div>
                  )}
                  {selectedScan?.scan_result?.repairSteps && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Repair Steps:</h4>
                      <p className="text-sm whitespace-pre-wrap">{selectedScan.scan_result.repairSteps}</p>
                    </div>
                  )}
                  {selectedScan?.scan_result?.toolsNeeded && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Tools Needed:</h4>
                      <p className="text-sm">{selectedScan.scan_result.toolsNeeded}</p>
                    </div>
                  )}
                  {selectedScan?.scan_result?.preventionTip && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Prevention Tip:</h4>
                      <p className="text-sm">{selectedScan.scan_result.preventionTip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default History;