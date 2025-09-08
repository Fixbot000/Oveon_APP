import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Heart, MessageCircle, ThumbsUp, ThumbsDown, Eye, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface Post {
  id: string;
  user_id: string;
  text: string;
  image_url: string | null;
  created_at: string;
  likes: number;
  dislikes: number;
  views: number;
  profiles?: {
    username: string;
    avatar_url: string | null;
    ispremium: boolean;
  };
  user_like?: 'like' | 'dislike' | null;
}

const Community = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      // Fetch posts with profiles
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            ispremium
          )
        `)
        .order('likes', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // If user is logged in, get their likes
      let userLikes: any[] = [];
      if (user) {
        const { data: likesData, error: likesError } = await supabase
          .from('post_likes')
          .select('post_id, like_type')
          .eq('user_id', user.id);
        
        if (likesError) throw likesError;
        userLikes = likesData || [];
      }

      // Combine posts with user likes
      const postsWithLikes = postsData?.map(post => ({
        ...post,
        user_like: userLikes.find(like => like.post_id === post.id)?.like_type || null
      })) || [];

      setPosts(postsWithLikes);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!user) {
      toast.error('Please sign in to create posts');
      return;
    }

    if (!newPostText.trim()) {
      toast.error('Please enter some text for your post');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          text: newPostText.trim()
        });

      if (error) throw error;

      setNewPostText('');
      toast.success('Post created successfully!');
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleLike = async (postId: string, likeType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;

      // Check if user already has a like on this post
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('like_type')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      let likeDelta = 0;
      let dislikeDelta = 0;

      if (existingLike) {
        if (existingLike.like_type === likeType) {
          // Remove like/dislike
          await supabase
            .from('post_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', postId);
          
          if (likeType === 'like') likeDelta = -1;
          else dislikeDelta = -1;
        } else {
          // Switch like/dislike
          await supabase
            .from('post_likes')
            .update({ like_type: likeType })
            .eq('user_id', user.id)
            .eq('post_id', postId);
          
          if (likeType === 'like') {
            likeDelta = 1;
            dislikeDelta = -1;
          } else {
            likeDelta = -1;
            dislikeDelta = 1;
          }
        }
      } else {
        // Add new like/dislike
        await supabase
          .from('post_likes')
          .insert({
            user_id: user.id,
            post_id: postId,
            like_type: likeType
          });
        
        if (likeType === 'like') likeDelta = 1;
        else dislikeDelta = 1;
      }

      // Update post counts
      await supabase
        .from('posts')
        .update({
          likes: currentPost.likes + likeDelta,
          dislikes: currentPost.dislikes + dislikeDelta
        })
        .eq('id', postId);

      fetchPosts();
    } catch (error: any) {
      console.error('Error handling like:', error);
      toast.error('Failed to update like');
    }
  };

  const incrementViews = async (postId: string) => {
    try {
      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;

      // Update UI optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, views: post.views + 1 }
            : post
        )
      );

      // Update database
      await supabase
        .from('posts')
        .update({ views: currentPost.views + 1 })
        .eq('id', postId);
    } catch (error) {
      console.error('Error incrementing views:', error);
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const openDiscussion = (postId: string) => {
    incrementViews(postId);
    navigate(`/discussion/${postId}`);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader onRefresh={fetchPosts} isPremium={user?.user_metadata?.isPremium} showBackButton={true} backButtonTarget="/" />
        <div className="px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="max-w-2xl mx-auto">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={fetchPosts} isPremium={user?.user_metadata?.isPremium} showBackButton={true} backButtonTarget="/" />
      
      <main className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Community</h1>
        </div>

        {/* Create Post */}
        {user && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Share with the community
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What's on your mind? Share your repair tips, ask questions, or discuss electronics..."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="min-h-[120px] w-full resize-none"
              />
              <Button 
                onClick={createPost} 
                className="w-full"
                disabled={!newPostText.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Share Post
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        <div className="space-y-6 max-w-2xl mx-auto">
          {posts.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something with the community!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className={`h-10 w-10 ${post.profiles?.ispremium ? 'ring-2 ring-amber-400' : ''}`}>
                      {post.profiles?.avatar_url && (
                        <img 
                          src={post.profiles.avatar_url} 
                          alt="User avatar"
                          className="w-full h-full object-cover rounded-full"
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {post.profiles?.username || 'Anonymous User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-left mb-4">
                    <p className="text-foreground leading-relaxed">
                      {post.text}
                    </p>
                  </div>

                  {post.image_url && (
                    <div className="mb-4">
                      <img 
                        src={post.image_url} 
                        alt="Post image"
                        className="w-full rounded-lg object-cover max-h-96"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id, 'like')}
                        className={`flex items-center space-x-1 ${
                          post.user_like === 'like' ? 'text-green-600' : 'text-muted-foreground'
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{post.likes}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id, 'dislike')}
                        className={`flex items-center space-x-1 ${
                          post.user_like === 'dislike' ? 'text-red-600' : 'text-muted-foreground'
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>{post.dislikes}</span>
                      </Button>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>{post.views}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDiscussion(post.id)}
                      className="flex items-center space-x-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Talk</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Community;