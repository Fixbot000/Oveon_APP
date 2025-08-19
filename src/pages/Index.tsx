import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Camera, History, Clock, Wrench } from 'lucide-react';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import ActionCard from '@/components/ActionCard';

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-header flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="flex items-center justify-center mb-8">
            <div className="p-6 bg-white/20 rounded-full">
              <Wrench className="h-16 w-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">FixBot</h1>
          <p className="text-xl text-white/80 mb-8">
            AI-powered electronics diagnosis and repair assistant
          </p>
          
          <Button 
            onClick={() => navigate('/auth')} 
            size="lg"
            className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 rounded-full"
          >
            Get Started - Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader />
      
      <main className="px-4 py-6 space-y-6">
        {/* Promotional Banner */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Effortlessly fix your devices!</h2>
            <p className="text-muted-foreground mb-4">
              Get AI-powered repair guidance in seconds
            </p>
            <Button className="bg-gradient-primary text-white rounded-full px-6">
              Learn more
            </Button>
            <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Ad
            </div>
          </CardContent>
        </Card>

        {/* Main Action Cards */}
        <div className="grid grid-cols-3 gap-4">
          <ActionCard
            icon={Camera}
            title="Scan"
            description="Capture device photos"
            onClick={() => navigate('/scan')}
          />
          <ActionCard
            icon={History}
            title="History"
            description="View past repairs"
            onClick={() => navigate('/history')}
          />
          <ActionCard
            icon={Wrench}
            title="Repair Bot"
            description="Chat with AI assistant"
            onClick={() => navigate('/chat')}
          />
        </div>

        {/* Tips & Tricks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Tips & Tricks</h3>
            <Button variant="ghost" className="text-primary">View all</Button>
          </div>
          
          <div className="grid gap-4">
            <Card className="bg-card shadow-card">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Capturing Circuit Photos for AI Analysis</h4>
                    <p className="text-xs text-muted-foreground mb-2">Today's tip</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-card">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Using a multimeter to check circuits</h4>
                    <p className="text-xs text-muted-foreground mb-2">Popular</p>
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
