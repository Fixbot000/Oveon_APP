import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Camera, History, Clock, Wrench, Star, TrendingUp, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import ActionCard from '@/components/ActionCard';
import { generateRepairTips, getDifficultyColor, type Tip } from '@/lib/tipsGenerator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Index = () => {
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  const loadTips = async () => {
    try {
      setLoading(true);
      const generatedTips = await generateRepairTips();
      setTips(generatedTips);
      localStorage.setItem('repairTips', JSON.stringify(generatedTips)); // Store tips in localStorage
      setCurrentTipIndex(0); // Reset to the first tip when new tips are loaded
    } catch (error) {
      console.error('Error loading tips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedTips = localStorage.getItem('repairTips');
    if (storedTips) {
      setTips(JSON.parse(storedTips));
    } else {
      loadTips();
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 75) { // Swiped left
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % tips.length);
    } else if (touchEndX - touchStartX > 75) { // Swiped right
      setCurrentTipIndex((prevIndex) => (prevIndex - 1 + tips.length) % tips.length);
    }
    setTouchStartX(0);
    setTouchEndX(0);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={loadTips} isPremium={isPremium} />
      
      <main className="px-4 py-6 space-y-8">
        {/* Auth Section */}
        {!user && (
          <div className="text-center">
            <Button onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground">
              Sign In / Sign Up
            </Button>
          </div>
        )}

        {/* Welcome Banner */}
        <Card className="bg-card shadow-card border-border">
          <CardContent className="p-6 text-center">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2 text-foreground">Effortlessly fix your devices!</h2>
              <p className="text-muted-foreground mb-4">
                Get AI-powered repair guidance in seconds
              </p>
              <Button className="bg-primary text-primary-foreground rounded-full px-6 shadow-lg hover:shadow-elevated transition-all duration-200">
                Learn more
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Action Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <ActionCard
            icon={Camera}
            title="Scan"
            description="Capture device photos"
            onClick={() => navigate('/scan')}
          />
          <ActionCard
            icon={Wrench}
            title="Repair Bot"
            description="Chat with AI assistant"
            onClick={() => navigate('/chat')}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <ActionCard
            icon={Users}
            title="Community"
            description="Share & learn together"
            onClick={() => navigate('/community')}
          />
          <ActionCard
            icon={History}
            title="History"
            description="View past repairs"
            onClick={() => navigate('/history')}
          />
        </div>

        {/* Tips & Tricks */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-foreground">Tips & Tricks</h3>
            <div className="flex items-center gap-2">
              
              <Button 
                variant="ghost" 
                className="text-primary hover:bg-primary/10 transition-colors"
                onClick={loadTips}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Refresh Tips'}
              </Button>
            </div>
          </div>
          
          {tips.length === 0 && !loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Click "Refresh Tips" to generate repair tips</p>
            </div>
          ) : loading ? (
            <div className="grid gap-3">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="bg-card shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div 
              className="relative h-64 mx-auto w-full max-w-sm"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {tips.map((tip, index) => {
                const isCurrent = index === currentTipIndex;
                const isNext = index === (currentTipIndex + 1) % tips.length;
                const isNextNext = index === (currentTipIndex + 2) % tips.length;
                const isAfterNextNext = index === (currentTipIndex + 3) % tips.length;
                
                let transform = 'none';
                let opacity = 0;
                let zIndex = 0;
                let scale = 1;

                if (isCurrent) {
                  transform = 'translateX(0)';
                  opacity = 1;
                  zIndex = 30;
                  scale = 1;
                } else if (isNext) {
                  transform = 'translateX(10px) scale(0.95)';
                  opacity = 0.7;
                  zIndex = 20;
                  scale = 0.95;
                } else if (isNextNext) {
                  transform = 'translateX(20px) scale(0.9)';
                  opacity = 0.4;
                  zIndex = 10;
                  scale = 0.9;
                } else if (isAfterNextNext) {
                  transform = 'translateX(30px) scale(0.85)';
                  opacity = 0.2;
                  zIndex = 5;
                  scale = 0.85;
                } else {
                  transform = 'translateX(40px) scale(0.8)'; // Further cards are even smaller and more transparent
                  opacity = 0;
                  zIndex = 0;
                  scale = 0.8;
                }

                return (
                  <div 
                    key={index} 
                    className="absolute w-full h-full bg-cover bg-center rounded-xl shadow-lg transition-all duration-300 ease-out"
                    style={{
                      backgroundImage: `url(${tip.imageUrl || 'https://via.placeholder.com/400x200?text=Repair+Tip'})`,
                      transform,
                      opacity,
                      zIndex,
                      // Ensure the image is always visible and does not scale down to 0
                      backgroundSize: 'cover',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      cursor: isCurrent ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (isCurrent) {
                        setSelectedTip(tip);
                        setIsDialogOpen(true);
                      } else {
                        // Allow clicking on visible stacked cards to bring them to front
                        setCurrentTipIndex(index);
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-xl"></div>
                    <div className="relative p-4 h-full flex flex-col justify-end">
                      <h4 className="font-bold text-lg text-white mb-1 text-balance">
                        {tip.title}
                      </h4>
                      <p className="text-sm text-white/90 mb-2 line-clamp-2">
                        {tip.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${getDifficultyColor(tip.difficulty)}`}>
                          {tip.difficulty}
                        </span>
                        <Clock className="w-4 h-4 text-white" />
                        <span className="text-xs text-white">{tip.readTime}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />

      {selectedTip && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedTip.title}</DialogTitle>
              <DialogDescription>{selectedTip.description}</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-2">{selectedTip.fullDescription}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`px-2 py-1 rounded-full ${getDifficultyColor(selectedTip.difficulty)}`}>
                {selectedTip.difficulty}
              </span>
              <Clock className="w-3 h-3" />
              <span>{selectedTip.readTime}</span>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Index;
