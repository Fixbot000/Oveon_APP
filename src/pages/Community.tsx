import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Send, Users, Image as ImageIcon, X, Zap, Heart, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
  };
}

const Community = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState({ content: '' });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [postLikes, setPostLikes] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const { user, signOut } = useAuth();
  
  // Pull-to-refresh states
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isAtTop = useRef(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles separately to avoid the join issue
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      // Map profiles to posts
      const postsWithProfiles = postsData?.map(post => ({
        ...post,
        profiles: profilesData?.find(p => p.user_id === post.user_id)
      })) || [];

      setPosts(postsWithProfiles);
      
      // Load likes and comments for each post
      if (postsWithProfiles?.length) {
        await loadPostLikesAndComments(postsWithProfiles.map(p => p.id));
      }
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const loadPostLikesAndComments = async (postIds: string[]) => {
    try {
      // Load likes
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, like_type, user_id')
        .in('post_id', postIds);

      const likeCounts: Record<string, number> = {};
      const userLikeTypes: Record<string, string> = {};
      
      likesData?.forEach(like => {
        if (like.like_type === 'like') {
          likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1;
        }
        if (like.user_id === user?.id) {
          userLikeTypes[like.post_id] = like.like_type;
        }
      });

      setPostLikes(likeCounts);
      setUserLikes(userLikeTypes);

      // Load comments
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      // Get user profiles for comments
      const commentUserIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: commentProfilesData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', commentUserIds);

      // Map profiles to comments
      const commentsWithProfiles = commentsData?.map(comment => ({
        ...comment,
        profiles: commentProfilesData?.find(p => p.user_id === comment.user_id)
      })) || [];

      const commentsByPost: Record<string, any[]> = {};
      commentsWithProfiles?.forEach(comment => {
        if (!commentsByPost[comment.post_id]) {
          commentsByPost[comment.post_id] = [];
        }
        commentsByPost[comment.post_id].push(comment);
      });

      setComments(commentsByPost);
    } catch (error) {
      console.error('Error loading likes and comments:', error);
    }
  };

  const handleLike = async (postId: string, likeType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      const existingLike = userLikes[postId];
      
      if (existingLike) {
        // Remove existing like
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      }

      if (existingLike !== likeType) {
        // Add new like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
            like_type: likeType
          });
      }

      // Reload likes
      await loadPostLikesAndComments([postId]);
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const content = newComment[postId]?.trim();
    if (!content) return;

    try {
      await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content
        });

      setNewComment(prev => ({ ...prev, [postId]: '' }));
      await loadPostLikesAndComments([postId]);
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast.error('Please sign in to create a post');
      return;
    }

    if (!newPost.content.trim()) {
      toast.error('Please add some content to your post');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          content: newPost.content,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Post created successfully!');
      setNewPost({ content: '' });
      setSelectedImages([]);
      loadPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error('Maximum 5 images allowed per post');
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    isAtTop.current = scrollTop <= 10;
    
    if (isAtTop.current) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTop.current || touchStartY.current === 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;
    
    if (distance > 0) {
      e.preventDefault();
      const normalizedDistance = Math.min(distance * 0.5, 100);
      setIsPulling(true);
      setPullDistance(normalizedDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling && pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await loadPosts();
        toast.success('Posts refreshed!');
      } catch (error) {
        console.error('Refresh error:', error);
        toast.error('Failed to refresh posts');
      }
      
      setTimeout(() => {
        setIsRefreshing(false);
        setIsPulling(false);
        setPullDistance(0);
        touchStartY.current = 0;
      }, 1000);
    } else {
      setIsPulling(false);
      setPullDistance(0);
      touchStartY.current = 0;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      isAtTop.current = scrollTop <= 10;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const RefreshIcon = () => (
    <div className="flex items-center justify-center p-2">
      <div className="relative">
        <div 
          className={`w-6 h-6 rounded-full border-2 border-foreground transition-all duration-200 ${
            isRefreshing ? 'animate-spin border-primary' : 'border-muted-foreground/60'
          }`}
          style={{
            borderStyle: 'solid',
            borderWidth: '2px'
          }}
        >
          <Zap 
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-3 w-3 transition-colors duration-200 ${
              isRefreshing ? 'stroke-primary' : 'stroke-muted-foreground/60'
            }`} 
            strokeWidth={2.5} 
            fill="none" 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-background pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <MobileHeader />
      
      {(isPulling || isRefreshing) && (
        <div 
          className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300"
          style={{
            opacity: isRefreshing ? 1 : Math.min(pullDistance / 40, 0.9),
            transform: `translate(-50%, ${isRefreshing ? '0px' : `${Math.max(-10, -20 + (pullDistance * 0.3))}px`})`
          }}
        >
          <div className="bg-background/80 backdrop-blur-sm rounded-full shadow-lg">
            <RefreshIcon />
          </div>
        </div>
      )}
      
      <main className="px-4 py-6 space-y-6">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Community</h1>
            {user && (
              <Button onClick={signOut} variant="outline" size="sm">
                Sign Out
              </Button>
            )}
          </div>
          
          <Card className="max-w-2xl mx-auto mb-8 shadow-lg border-2 border-border/50 bg-card/95">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Textarea
                  placeholder="What's on your mind? Share your repair tips, ask questions, or discuss electronics..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="min-h-[120px] w-full resize-none"
                />

                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ImageIcon className="h-4 w-4" />
                    Upload Photos ({selectedImages.length}/5)
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={selectedImages.length >= 5}
                    />
                  </label>
                </div>

                <Button 
                  onClick={handleCreatePost} 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={!newPost.content.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Share Post
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
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
          ) : posts.length === 0 ? (
            <Card className="max-w-2xl mx-auto text-center py-8">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something with the community!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              {posts.map((post) => (
                <Card key={post.id} className="shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-10 w-10">
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

                    <p className="text-foreground mb-4 leading-relaxed">
                      {post.content}
                    </p>

                    {post.image_url && (
                      <div className="mb-4">
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="w-full h-64 object-cover rounded-lg border"
                        />
                      </div>
                    )}

                    {/* Like and Comment buttons */}
                    <div className="flex items-center space-x-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id, 'like')}
                        className={`flex items-center space-x-1 ${
                          userLikes[post.id] === 'like' ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{postLikes[post.id] || 0}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id, 'dislike')}
                        className={`flex items-center space-x-1 ${
                          userLikes[post.id] === 'dislike' ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="flex items-center space-x-1 text-muted-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{comments[post.id]?.length || 0}</span>
                      </Button>
                    </div>

                    {/* Comments section */}
                    {showComments[post.id] && (
                      <div className="mt-4 space-y-3">
                        {/* Add comment */}
                        {user && (
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Add a comment..."
                              value={newComment[post.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleComment(post.id)}
                              disabled={!newComment[post.id]?.trim()}
                            >
                              Send
                            </Button>
                          </div>
                        )}

                        {/* Display comments */}
                        {comments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex space-x-2 bg-muted/30 p-3 rounded">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{comment.profiles?.username || 'Anonymous'}</p>
                              <p className="text-sm text-muted-foreground">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

export default Community;