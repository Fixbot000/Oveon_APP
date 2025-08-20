import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, ThumbsUp, ThumbsDown, Plus, Send, Reply, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface Post {
  id: string;
  title?: string;
  content?: string;
  image_urls?: string[];
  post_type: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name?: string;
  };
  like_count?: number;
  dislike_count?: number;
  comment_count?: number;
  user_like_status?: 'like' | 'dislike' | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name?: string;
  };
}

const Community = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    checkUser();
    loadPosts();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      // Load posts with profiles and engagement counts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_likes (like_type),
          post_comments (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for the posts
      const userIds = [...new Set(postsData?.map(post => post.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Create a profile lookup map
      const profileMap = profilesData?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      // Process posts to include engagement metrics and profiles
      const processedPosts = postsData?.map(post => {
        const likes = post.post_likes?.filter((like: any) => like.like_type === 'like').length || 0;
        const dislikes = post.post_likes?.filter((like: any) => like.like_type === 'dislike').length || 0;
        const commentCount = post.post_comments?.length || 0;

        return {
          ...post,
          like_count: likes,
          dislike_count: dislikes,
          comment_count: commentCount,
          profiles: profileMap[post.user_id] || null,
        };
      }) || [];

      setPosts(processedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!user) {
      toast.error('Please sign in to create posts');
      return;
    }

    if (!newPost.title && !newPost.content) {
      toast.error('Please add some content to your post');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          title: newPost.title || null,
          content: newPost.content || null,
          post_type: newPost.title && newPost.content ? 'mixed' : newPost.title ? 'text' : 'text',
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Post created successfully!');
      setNewPost({ title: '', content: '' });
      setIsCreateOpen(false);
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const toggleLike = async (postId: string, likeType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Please sign in to interact with posts');
      return;
    }

    try {
      // Check if user already liked/disliked this post
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        if (existingLike.like_type === likeType) {
          // Remove like/dislike
          await supabase
            .from('post_likes')
            .delete()
            .eq('id', existingLike.id);
        } else {
          // Update like/dislike
          await supabase
            .from('post_likes')
            .update({ like_type: likeType })
            .eq('id', existingLike.id);
        }
      } else {
        // Create new like/dislike
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
            like_type: likeType,
          });
      }

      loadPosts(); // Refresh posts to update counts
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user profiles for the comments
      const userIds = [...new Set(commentsData?.map(comment => comment.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Create a profile lookup map
      const profileMap = profilesData?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      // Process comments to include profiles
      const processedComments = commentsData?.map(comment => ({
        ...comment,
        profiles: profileMap[comment.user_id] || null,
      })) || [];

      setComments(prev => ({ ...prev, [postId]: processedComments }));
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const addComment = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      loadComments(postId);
      loadPosts(); // Refresh to update comment count
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const toggleComments = (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
    } else {
      setExpandedComments(postId);
      if (!comments[postId]) {
        loadComments(postId);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader />
      
      <main className="px-4 py-6 space-y-6">
        {/* Header with Create Post Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Community</h1>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:scale-105 transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Post title (optional)"
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
                <Button onClick={createPost} className="w-full bg-gradient-primary">
                  Share Post
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-gradient-card">
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-20 bg-muted rounded"></div>
                    <div className="flex gap-4">
                      <div className="h-8 bg-muted rounded w-16"></div>
                      <div className="h-8 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-gradient-card text-center py-8">
            <CardContent>
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground">Be the first to share something with the community!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-4">
                  {/* Post Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {post.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {post.profiles?.display_name || 'Anonymous User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.title && (
                    <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                  )}
                  {post.content && (
                    <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike(post.id, 'like')}
                        className="flex items-center gap-2 hover:text-green-600 transition-colors"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {post.like_count || 0}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike(post.id, 'dislike')}
                        className="flex items-center gap-2 hover:text-red-600 transition-colors"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {post.dislike_count || 0}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.comment_count || 0}
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments === post.id && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {/* Add Comment */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => addComment(post.id)}
                          size="sm"
                          className="self-end"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Comments List */}
                      {comments[post.id]?.map((comment) => (
                        <div key={comment.id} className="flex gap-3 bg-muted/30 rounded-lg p-3">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {comment.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">
                                {comment.profiles?.display_name || 'Anonymous User'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-sm">{comment.content}</p>
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
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Community;