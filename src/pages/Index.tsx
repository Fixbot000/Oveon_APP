import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Camera, History, Clock, Wrench, Star, TrendingUp, Users } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import ActionCard from '@/components/ActionCard';
import { generateRepairTips, getDifficultyColor, type Tip } from '@/lib/tipsGenerator';
import BottomSheetModal from '@/components/BottomSheetModal';
import { useMediaQuery } from 'react-responsive';
import heroImage from '@/assets/hero-diagnostic-card.jpg';

const Index = () => {
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
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
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const tipRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setCurrentTipIndex(tipRefs.current.findIndex((ref) => ref === entry.target));
        }
      });
    }, {
      root: null, // Use the viewport as the root
      rootMargin: '0px', // No margin
      threshold: 0.5, // Trigger when 50% of the tip is visible
    });

    tipRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [tips.length]);

  const handlePointerStart = (e: React.PointerEvent) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    setIsDragging(false);
    setIsHorizontalDrag(false);
    setDragOffset(0);
    setHasMoved(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startX === 0) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Determine if this is a horizontal drag
    if (!isHorizontalDrag && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      setIsHorizontalDrag(Math.abs(deltaX) > Math.abs(deltaY));
      setHasMoved(true);
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
        
      } else {
        // Swiped left - go to next
        
      }
    }

    // Reset states
    setDragOffset(0);
    setStartX(0);
    setStartY(0);
    setIsDragging(false);
    setIsHorizontalDrag(false);
    setLongPressTimeout(null);
    setIsLongPress(false);
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

        {/* Hero Diagnostic Card */}
        <Card className="bg-card shadow-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="relative w-full max-w-md mx-auto">
              <img
                src={heroImage}
                alt="Oveon Smart Diagnostics - Snap, Scan, Solve"
                className="w-full h-auto rounded-lg"
                style={{ 
                  objectFit: 'contain',
                  objectPosition: 'center'
                }}
                loading="eager"
                onLoad={() => {
                  // Cache the image in browser cache
                  localStorage.setItem('hero-image-cached', 'true');
                }}
                onError={(e) => {
                  console.error('Failed to load hero image:', e);
                }}
              />
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
              className="relative w-full h-64 cursor-grab active:cursor-grabbing select-none overflow-x-auto scroll-smooth snap-x snap-mandatory dark:scrollbar-dark"
              style={{ willChange: 'transform' }}
            >
              <div 
                className="flex h-full"
                style={{
                  
                }}
              >
                {tips.map((tip, index) => {
                  const isCurrent = index === currentTipIndex;
                  const distance = Math.abs(index - currentTipIndex);
                  
                  return (
                    <div
                      key={index}
                      ref={(el) => (tipRefs.current[index] = el)}
                      className="flex-shrink-0 w-full h-full relative mr-4 snap-center"
                      style={{
                        flexBasis: isMobile ? '100%' : '85%',
                        zIndex: isCurrent ? 30 : Math.max(0, 20 - distance),
                        pointerEvents: isCurrent ? 'auto' : 'none',
                      }}
                      onPointerDown={(e) => {
                        if (isMobile) {
                          setLongPressTimeout(setTimeout(() => {
                            setIsLongPress(true);
                            setSelectedTip(tip);
                            setIsDialogOpen(true);
                          }, 500)); // 500ms for a long press
                        }
                        handlePointerStart(e);
                      }}
                      onPointerUp={() => {
                        if (longPressTimeout) {
                          clearTimeout(longPressTimeout);
                          setLongPressTimeout(null);
                        }
                        if (!isMobile || (isMobile && !isLongPress && !hasMoved)) {
                          if (isCurrent && !hasMoved) {
                            setSelectedTip(tip);
                            setIsDialogOpen(true);
                          }
                        }
                        handlePointerEnd();
                      }}
                      onPointerLeave={() => {
                        if (longPressTimeout) {
                          clearTimeout(longPressTimeout);
                          setLongPressTimeout(null);
                        }
                        handlePointerEnd();
                      }}
                    >
                      <div 
                        className={`w-full h-full rounded-xl shadow-lg transition-all duration-300 ease-out ${
                          ['bg-gradient-to-br from-blue-500 to-purple-600',
                           'bg-gradient-to-br from-green-500 to-teal-600', 
                           'bg-gradient-to-br from-orange-500 to-red-600',
                           'bg-gradient-to-br from-purple-500 to-pink-600',
                           'bg-gradient-to-br from-indigo-500 to-blue-600',
                           'bg-gradient-to-br from-emerald-500 to-cyan-600'][index % 6]
                        }`}
                        style={{
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
          )}
        </div>
      </main>

      <BottomNavigation />

      <BottomSheetModal 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={selectedTip?.title || "Tip"}
      >
        {selectedTip && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(selectedTip.difficulty)}`}>
                {selectedTip.difficulty}
              </span>
              <span className="text-xs text-muted-foreground">{selectedTip.readTime}</span>
            </div>
            <p className="text-foreground leading-relaxed text-base">{selectedTip.fullDescription}</p>
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
};

export default Index;
