import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon, FileText, Wrench, Calendar, User, Sun, Moon, LogOut, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface UserPost {
  id: string;
  content: string;
  created_at: string;
}

interface DiagnosticSession {
  id: string;
  device_category?: string;
  symptoms_text?: string;
  status: string;
  created_at: string;
  ai_analysis?: any;
}

const History = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [diagnosticSessions, setDiagnosticSessions] = useState<DiagnosticSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (user) {
      checkUser();
    }
  }, [user]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = stored ? stored === 'dark' : prefersDark;
      setIsDarkMode(initialDark);
      document.documentElement.classList.toggle('dark', initialDark);
    } catch (e) {
      // noop
    }
  }, []);

  const checkUser = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserPosts(postsData || []);

      // Fetch diagnostic sessions
      const { data: sessionsData } = await supabase
        .from('diagnostic_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setDiagnosticSessions(sessionsData || []);

    } catch (error: any) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    try {
      document.documentElement.classList.toggle('dark', checked);
      localStorage.setItem('theme', checked ? 'dark' : 'light');
    } catch (e) {
      // noop
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader onRefresh={checkUser} />
        <main className="px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader onRefresh={() => window.location.reload()} />
        <main className="px-4 py-6">
          <Card className="text-center py-8">
            <CardContent>
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to view your activity history and manage your profile.
              </p>
              <Button onClick={() => window.location.href = '/auth'} className="bg-primary">
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={checkUser} />
      
      <main className="px-4 py-6 space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">History</h1>
            {user && (
              <Button onClick={signOut} variant="outline" size="sm">
                Sign Out
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Sun className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">Appearance</p>
                      <p className="text-sm text-muted-foreground">{isDarkMode ? 'Dark' : 'Light'} mode</p>
                    </div>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={handleToggleTheme} />
                </div>

                <div className="grid gap-2">
                  <button
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left"
                    onClick={() => (window.location.href = '/help')}
                  >
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Help</span>
                  </button>
                  <button
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left"
                    onClick={() => (window.location.href = '/terms')}
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Terms & Policies</span>
                  </button>
                  <button
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left text-destructive"
                    onClick={signOut}
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posts" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="repairs" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Repairs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4">
              {userPosts.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground">No Posts Yet</h3>
                      <p className="text-muted-foreground">Your posts will appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                userPosts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Post</Badge>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-foreground line-clamp-3">
                            {post.content}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="repairs" className="space-y-4">
              {diagnosticSessions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground">No Repairs Yet</h3>
                      <p className="text-muted-foreground">Your diagnostic sessions will appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                diagnosticSessions.map((session) => (
                  <Card key={session.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                            {session.status}
                          </Badge>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(session.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {session.device_category && (
                          <h4 className="font-semibold capitalize">
                            {session.device_category} Repair
                          </h4>
                        )}
                        
                        {session.symptoms_text && (
                          <p className="text-muted-foreground text-sm">
                            Symptoms: {session.symptoms_text}
                          </p>
                        )}
                        
                        {session.ai_analysis && (
                          <div className="bg-muted/30 p-3 rounded">
                            <p className="text-xs font-medium text-muted-foreground mb-1">AI Analysis:</p>
                            <p className="text-sm line-clamp-2">
                              {typeof session.ai_analysis === 'string' 
                                ? session.ai_analysis 
                                : JSON.stringify(session.ai_analysis)
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default History;