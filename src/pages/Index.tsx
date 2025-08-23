import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Camera, History, Clock, Wrench, Star, TrendingUp, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import ActionCard from '@/components/ActionCard';
import { generateRepairTips, getTipImage, getDifficultyColor, type Tip } from '@/lib/tipsGenerator';
import circuitImage from '@/assets/circuit-analysis-tip.jpg';
import multimeterImage from '@/assets/multimeter-tip.jpg';
import solderingImage from '@/assets/soldering-tip.jpg';
import screenRepairImage from '@/assets/screen-repair-tip.jpg';
import batteryTestingImage from '@/assets/battery-testing-tip.jpg';
import antistaticImage from '@/assets/antistatic-tip.jpg';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTips = async () => {
    try {
      setLoading(true);
      const generatedTips = await generateRepairTips();
      setTips(generatedTips);
    } catch (error) {
      console.error('Error loading tips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTips();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={loadTips} />
      
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
            <Button 
              variant="ghost" 
              className="text-primary hover:bg-primary/10 transition-colors"
              onClick={loadTips}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Refresh Tips'}
            </Button>
          </div>
          
          {loading ? (
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
            <div className="grid gap-3">
              {tips.map((tip, index) => (
                <Card key={index} className="bg-card shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer border-border">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                        <img 
                          src={tip.imageUrl || getTipImage(tip.category)} 
                          alt={tip.imageAlt} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors text-sm text-foreground">{tip.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{tip.description}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(tip.difficulty)}`}>
                            {tip.difficulty}
                          </span>
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{tip.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Index;
