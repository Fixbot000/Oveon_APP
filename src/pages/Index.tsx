import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Camera, History, Clock, Wrench, Star, TrendingUp, Users, Search, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import ActionCard from '@/components/ActionCard';
import { generateRepairTips, getDifficultyColor, type Tip } from '@/lib/tipsGenerator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Index = () => {
  const navigate = useNavigate();
  const { user, isPremium, premiumUiEnabled } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isHorizontalDrag, setIsHorizontalDrag] = useState(false);

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

  const handlePointerStart = (e: React.PointerEvent) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    setIsDragging(false);
    setIsHorizontalDrag(false);
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startX === 0) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Determine if this is a horizontal drag
    if (!isHorizontalDrag && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      setIsHorizontalDrag(Math.abs(deltaX) > Math.abs(deltaY));
    }

    if (isHorizontalDrag) {
      e.preventDefault();
      setIsDragging(true);
      setDragOffset(deltaX);
    }
  };

  const handlePointerEnd = () => {
    if (!isDragging || !isHorizontalDrag) {
      setDragOffset(0);
      setStartX(0);
      setStartY(0);
      setIsDragging(false);
      setIsHorizontalDrag(false);
      return;
    }

    const cardWidth = 280; // Approximate card width
    const threshold = Math.min(cardWidth * 0.3, 80);

    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        // Swiped right - go to previous
        setCurrentTipIndex((prevIndex) => (prevIndex - 1 + tips.length) % tips.length);
      } else {
        // Swiped left - go to next
        setCurrentTipIndex((prevIndex) => (prevIndex + 1) % tips.length);
      }
    }

    // Reset states
    setDragOffset(0);
    setStartX(0);
    setStartY(0);
    setIsDragging(false);
    setIsHorizontalDrag(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={loadTips} isPremium={isPremium} />
      
      <main className="px-4 py-6 space-y-8">
        {premiumUiEnabled ? (
          /* Premium UI */
          <div className="space-y-6">
            {/* Premium Header */}
            <div className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
                </h2>
                <p className="text-muted-foreground text-sm">Ready to fix something?</p>
              </div>
            </div>

            {/* Premium Search Bar */}
            <div className="px-4">
              <div className="relative">
                <Input
                  placeholder="Search solutions..."
                  className="h-12 pl-10 pr-12 bg-muted/50 border-muted-foreground/20 rounded-xl"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Button size="icon" variant="ghost" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Premium Hero Card */}
            <div className="px-4">
              <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/20">
                <CardContent className="p-6">
                  <div className="relative z-10">
                    <div className="absolute top-2 right-2 w-3 h-3 bg-amber-400/60 rounded-sm"></div>
                    <div className="absolute bottom-2 left-2 w-3 h-3 bg-amber-400/60 rounded-sm"></div>
                    <div className="flex items-center justify-center h-32">
                      <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center">
                        <Wrench className="w-8 h-8 text-slate-900" />
                      </div>
                    </div>
                  </div>
                  {/* Decorative grid pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-12 grid-rows-6 h-full w-full">
                      {Array.from({ length: 72 }).map((_, i) => (
                        <div key={i} className="border border-amber-400/20"></div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Premium Instant Repair Section */}
            <div className="px-4">
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Instant Device Repair</h3>
                    <p className="text-muted-foreground text-sm">Get AI-powered repair photos</p>
                  </div>
                  <Button 
                    onClick={() => navigate('/scan')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium"
                  >
                    Start Diagnostic
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Premium Quick Actions */}
            <div className="px-4">
              <div className="grid grid-cols-4 gap-4">
                <button 
                  onClick={() => navigate('/scan')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-100 dark:bg-amber-900/20 hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Scan</span>
                </button>

                <button 
                  onClick={() => navigate('/chat')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">AI Bot</span>
                </button>

                <button 
                  onClick={() => navigate('/community')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Community</span>
                </button>

                <button 
                  onClick={() => navigate('/history')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">History</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Standard UI */
          <div className="space-y-8">
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
          </div>
        )}

        {/* Tips & Tricks */}
        {!premiumUiEnabled && (
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
            <div className="overflow-hidden w-full max-w-sm mx-auto">
              <div 
                className="relative w-full h-64 cursor-grab active:cursor-grabbing select-none"
                style={{ willChange: 'transform' }}
                onPointerDown={handlePointerStart}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerLeave={handlePointerEnd}
              >
                <div 
                  className="flex transition-transform duration-300 ease-out h-full"
                  style={{
                    transform: `translateX(calc(-${currentTipIndex * 85}% + ${isDragging ? dragOffset : 0}px))`,
                    transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  {tips.map((tip, index) => {
                    const isCurrent = index === currentTipIndex;
                    const distance = Math.abs(index - currentTipIndex);
                    
                    return (
                      <div
                        key={index}
                        className="flex-shrink-0 w-full h-full relative mr-4"
                        style={{
                          flexBasis: '85%',
                          zIndex: isCurrent ? 30 : Math.max(0, 20 - distance),
                          pointerEvents: isCurrent ? 'auto' : 'none',
                        }}
                        onClick={() => {
                          if (isCurrent && !isDragging) {
                            setSelectedTip(tip);
                            setIsDialogOpen(true);
                          }
                        }}
                      >
                        <div 
                          className="w-full h-full bg-cover bg-center rounded-xl shadow-lg transition-all duration-300 ease-out"
                          style={{
                            backgroundImage: `url(${tip.imageUrl || `data:image/svg+xml;base64,${btoa(`
                              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                                <rect width="400" height="200" fill="#f8fafc"/>
                                <circle cx="200" cy="100" r="60" fill="#3b82f6" opacity="0.1"/>
                                <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#1e40af">Repair Tip</text>
                              </svg>
                            `)}`})`,
                            backgroundSize: 'cover',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            opacity: isCurrent ? 1 : 0.7,
                            transform: isCurrent ? 'scale(1)' : 'scale(0.95)',
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
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </div>
        )}
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
