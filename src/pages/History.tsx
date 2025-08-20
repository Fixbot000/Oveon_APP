import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon, FileText, Wrench, Calendar, User } from 'lucide-react';
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

  useEffect(() => {
    if (user) {
      checkUser();
    }
  }, [user]);

  const checkUser = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader />
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
        <MobileHeader />
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
      <MobileHeader />
      
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
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile?.username || 'Anonymous User'}
                  </h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="flex space-x-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{userPosts.length}</p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{diagnosticSessions.length}</p>
                    <p className="text-sm text-muted-foreground">Repairs</p>
                  </div>
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