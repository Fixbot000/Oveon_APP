import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon, FileText, MessageCircle, Heart, Wrench, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface UserPost {
  id: string;
  title?: string;
  content?: string;
  post_type: string;
  created_at: string;
  like_count: number;
  comment_count: number;
}

interface UserComment {
  id: string;
  content: string;
  created_at: string;
  posts: {
    title?: string;
    content?: string;
  };
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [userComments, setUserComments] = useState<UserComment[]>([]);
  const [diagnosticSessions, setDiagnosticSessions] = useState<DiagnosticSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);

      // Load user's posts with engagement counts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          post_likes (like_type),
          post_comments (id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const processedPosts = postsData?.map(post => ({
        ...post,
        like_count: post.post_likes?.filter((like: any) => like.like_type === 'like').length || 0,
        comment_count: post.post_comments?.length || 0,
      })) || [];

      setUserPosts(processedPosts);

      // Load user's comments
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select(`
          *,
          posts (title, content)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserComments(commentsData || []);

      // Load diagnostic sessions (repair history)
      const { data: sessionsData } = await supabase
        .from('diagnostic_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setDiagnosticSessions(sessionsData || []);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user history');
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
          <Card className="bg-gradient-card text-center py-8">
            <CardContent>
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to view your activity history and manage your profile.
              </p>
              <Button onClick={() => window.location.href = '/auth'} className="bg-gradient-primary">
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
        {/* Profile Header */}
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold">
                  {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {profile?.display_name || 'User Profile'}
                </h2>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{userPosts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{userComments.length}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{diagnosticSessions.length}</p>
                <p className="text-xs text-muted-foreground">Repairs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="repairs" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Repairs
            </TabsTrigger>
          </TabsList>

          {/* User Posts */}
          <TabsContent value="posts" className="space-y-4">
            {userPosts.length === 0 ? (
              <Card className="bg-gradient-card text-center py-8">
                <CardContent>
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground">Start sharing with the community!</p>
                </CardContent>
              </Card>
            ) : (
              userPosts.map((post) => (
                <Card key={post.id} className="bg-gradient-card shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline" className="text-xs">
                        {post.post_type}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {post.title && (
                      <h4 className="font-semibold mb-2">{post.title}</h4>
                    )}
                    {post.content && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {post.content}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.like_count} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.comment_count} comments
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* User Comments */}
          <TabsContent value="comments" className="space-y-4">
            {userComments.length === 0 ? (
              <Card className="bg-gradient-card text-center py-8">
                <CardContent>
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
                  <p className="text-muted-foreground">Join the conversation!</p>
                </CardContent>
              </Card>
            ) : (
              userComments.map((comment) => (
                <Card key={comment.id} className="bg-gradient-card shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="secondary" className="text-xs">
                        Comment
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <p className="text-sm mb-3">{comment.content}</p>
                    
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                      <p className="font-medium mb-1">On post:</p>
                      <p className="line-clamp-2">
                        {comment.posts?.title || comment.posts?.content || 'Untitled post'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Repair History */}
          <TabsContent value="repairs" className="space-y-4">
            {diagnosticSessions.length === 0 ? (
              <Card className="bg-gradient-card text-center py-8">
                <CardContent>
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No repair history</h3>
                  <p className="text-muted-foreground">Start using our repair tools!</p>
                </CardContent>
              </Card>
            ) : (
              diagnosticSessions.map((session) => (
                <Card key={session.id} className="bg-gradient-card shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge 
                        variant={session.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {session.device_category && (
                      <h4 className="font-semibold mb-2 capitalize">
                        {session.device_category} Repair
                      </h4>
                    )}
                    
                    {session.symptoms_text && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        Symptoms: {session.symptoms_text}
                      </p>
                    )}
                    
                    {session.ai_analysis && (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                        <p className="font-medium mb-1">AI Analysis:</p>
                        <p className="line-clamp-2">
                          {typeof session.ai_analysis === 'string' 
                            ? session.ai_analysis 
                            : JSON.stringify(session.ai_analysis)
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default History;