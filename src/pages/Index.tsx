import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Camera, History, Clock, Wrench, Star, TrendingUp, Users } from 'lucide-react';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import ActionCard from '@/components/ActionCard';
import circuitImage from '@/assets/circuit-analysis-tip.jpg';
import multimeterImage from '@/assets/multimeter-tip.jpg';
import solderingImage from '@/assets/soldering-tip.jpg';
import screenRepairImage from '@/assets/screen-repair-tip.jpg';
import batteryTestingImage from '@/assets/battery-testing-tip.jpg';
import antistaticImage from '@/assets/antistatic-tip.jpg';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader />
      
      <main className="px-4 py-6 space-y-8">
        {/* Auth Section */}
        {!user && (
          <div className="text-center">
            <Button onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground">
              Sign In / Sign Up
            </Button>
          </div>
        )}
        {/* Promotional Banner */}
        <Card className="bg-gradient-card shadow-card border-0 relative overflow-hidden">
          <CardContent className="p-6 text-center">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2">Effortlessly fix your devices!</h2>
              <p className="text-muted-foreground mb-4">
                Get AI-powered repair guidance in seconds
              </p>
              <Button className="bg-gradient-primary text-white rounded-full px-6 shadow-lg hover:shadow-elevated transition-all duration-200">
                Learn more
              </Button>
            </div>
            <div className="absolute top-3 right-3 text-xs text-muted-foreground bg-muted/80 backdrop-blur-sm px-2 py-1 rounded-full">
              Ad
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-50"></div>
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
            <h3 className="text-xl font-bold">Tips & Tricks</h3>
            <Button variant="ghost" className="text-primary hover:bg-primary/10 transition-colors">View all</Button>
          </div>
          
          <div className="grid gap-3">
            <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                    <img 
                      src={circuitImage} 
                      alt="Circuit board analysis" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors text-sm">Capturing Circuit Photos for AI Analysis</h4>
                    <p className="text-xs text-muted-foreground mb-2">Learn optimal lighting and angles for AI analysis</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Today's tip</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">3 min read</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                    <img 
                      src={multimeterImage} 
                      alt="Multimeter testing circuits" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors text-sm">Using a multimeter to check circuits</h4>
                    <p className="text-xs text-muted-foreground mb-2">Essential measurement techniques for electronic repairs</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">Popular</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">5 min read</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                    <img 
                      src={solderingImage} 
                      alt="Professional soldering techniques" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors text-sm">Professional Soldering Techniques</h4>
                    <p className="text-xs text-muted-foreground mb-2">Master precise component replacement and repair</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full">Advanced</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">8 min read</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                    <img 
                      src={screenRepairImage} 
                      alt="Screen repair tools and techniques" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors text-sm">Screen Replacement Guide</h4>
                    <p className="text-xs text-muted-foreground mb-2">Step-by-step smartphone screen repair process</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">Featured</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">6 min read</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                    <img 
                      src={batteryTestingImage} 
                      alt="Battery testing and diagnostics" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors text-sm">Battery Health Testing</h4>
                    <p className="text-xs text-muted-foreground mb-2">Diagnose battery issues with professional tools</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">Essential</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">4 min read</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300 group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden shadow-sm">
                    <img 
                      src={antistaticImage} 
                      alt="ESD protection and safety" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors text-sm">ESD Protection Essentials</h4>
                    <p className="text-xs text-muted-foreground mb-2">Safe handling practices for sensitive electronics</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-red-500/10 text-red-600 px-2 py-1 rounded-full">Safety</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">3 min read</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Index;
