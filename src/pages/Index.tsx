import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Wrench, Zap, Camera, Brain, LogOut, User } from 'lucide-react';

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <div className="p-4 bg-primary rounded-full mr-4">
              <Wrench className="h-12 w-12 text-primary-foreground" />
            </div>
            <div className="p-4 bg-accent rounded-full">
              <Zap className="h-12 w-12 text-accent-foreground" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-foreground mb-4">FixBot</h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered electronics diagnosis and repair assistant
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2 text-primary" />
                  Scan & Analyze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Upload photos of devices, PCBs, and components. Our AI analyzes images and generates diagnostic questions.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-primary" />
                  Smart Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get structured repair guidance with problem diagnosis, fix steps, tools needed, and safety tips.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          
          <Button 
            onClick={() => navigate('/auth')} 
            size="lg"
            className="text-lg px-8 py-6"
          >
            Get Started - Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-primary rounded-full mr-3">
              <Wrench className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">FixBot</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-2" />
              {user.email}
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Welcome back! Ready to diagnose electronics?
          </h2>
          <p className="text-lg text-muted-foreground">
            Upload photos of your devices and get AI-powered repair guidance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2 text-primary" />
                New Diagnosis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Start a new repair session by uploading device photos
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-primary" />
                Repair History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View your previous diagnoses and repair sessions
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage your profile and expertise preferences
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
