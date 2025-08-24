import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string | null;
  content: string | null;
  image_urls: string[] | null;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface DiagnosticSession {
  id: string;
  created_at: string;
  device_category: string | null;
  symptoms_text: string | null;
  ai_analysis: any | null; // Adjust this type as per your JSONB structure
  repair_guidance: any | null; // Adjust this type as per your JSONB structure
  image_urls: string[] | null;
  user_id: string;
}

const History = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [diagnosticSessions, setDiagnosticSessions] = useState<DiagnosticSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setError('Please log in to view your history.');
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user's posts without join to avoid relation issues
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        
        // Get user profile separately
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        setPosts((postsData || []).map(post => ({ 
          ...post, 
          title: post.content?.substring(0, 50) + '...' || 'Untitled Post',
          profiles: profileData || { username: 'Unknown User', avatar_url: null }
        })) as Post[]);

        // Fetch diagnostic sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('diagnostic_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (sessionsError) throw sessionsError;
        setDiagnosticSessions(sessionsData as DiagnosticSession[] || []);

      } catch (err: any) {
        console.error('Error fetching history:', err);
        setError('Failed to load history: ' + err.message);
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto p-4 pb-20">
          <p>Loading history...</p>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto p-4 pb-20">
          <p className="text-red-500">Error: {error}</p>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <h2 className="text-2xl font-bold mb-4">My Posts</h2>
        {posts.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No posts found.</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <Card key={post.id} className="w-full max-w-2xl mx-auto">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Avatar>
                      <AvatarFallback>
                        {post.profiles?.username ? post.profiles.username[0].toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{post.profiles?.username || 'Unknown User'}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {post.title && <h3 className="text-lg font-semibold mb-2">{post.title}</h3>}
                  {post.content && <p className="mb-4">{post.content}</p>}
                  {post.image_urls && post.image_urls.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                      {post.image_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Post image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4 mt-8">My Diagnostic Sessions</h2>
        {diagnosticSessions.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">No diagnostic sessions found.</p>
        ) : (
          <div className="space-y-4">
            {diagnosticSessions.map(session => (
              <Card key={session.id} className="w-full max-w-2xl mx-auto">
                <CardContent className="p-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                    {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                  </p>
                  <h3 className="text-lg font-semibold mb-2">Device: {session.device_category || 'N/A'}</h3>
                  {session.symptoms_text && <p className="mb-2">Symptoms: {session.symptoms_text}</p>}
                  {session.ai_analysis?.finalSolution && (
                    <div className="mb-2">
                      <h4 className="font-medium">AI Analysis & Solution:</h4>
                      <p>{session.ai_analysis.finalSolution}</p>
                    </div>
                  )}
                  {session.image_urls && session.image_urls.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                      {session.image_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Diagnostic image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default History;
