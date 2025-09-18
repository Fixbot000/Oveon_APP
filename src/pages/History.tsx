import React, { useState, useEffect } from 'react';
import { Clock, FileText, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Scan {
  id: string;
  device_category: string;
  ai_analysis: any;
  created_at: string;
  updated_at: string;
}

const History = () => {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  useEffect(() => {
    if (user) {
      fetchScans();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const fetchScans = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('diagnostic_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching scans:', error);
        toast.error('Failed to fetch scan history');
      } else {
        setScans(data || []);
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

  const getResultPreview = (scan: Scan) => {
    if (scan.ai_analysis?.finalSolution) {
      const solution = scan.ai_analysis.finalSolution;
      const lines = solution.split('\n').filter((line: string) => line.trim());
      const firstLine = lines.find((line: string) => line.includes('Problem') || line.includes('Issue'));
      if (firstLine) {
        return firstLine.replace(/[#•-]\s*/, '').slice(0, 60) + '...';
      }
      return solution.slice(0, 60) + '...';
    }
    return 'Analysis completed';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        onRefresh={() => window.location.reload()} 
        isPremium={isPremium}
        showBackButton={true}
        backButtonTarget="/profile"
      />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Scan History
          </h1>
          
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
                          <h3 className="font-semibold">{scan.device_category}</h3>
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(scan.created_at)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getResultPreview(scan)}
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
              {selectedScan?.device_category}
            </DialogTitle>
            <DialogDescription>
              Scanned on {selectedScan && formatDate(selectedScan.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">
                {selectedScan?.ai_analysis?.finalSolution || 'No analysis available'}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default History;