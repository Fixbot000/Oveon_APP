import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, ThumbsUp, ThumbsDown, Plus, Send, Reply, Users, Image as ImageIcon, X } from 'lucide-react';
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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
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

    if (!newPost.title && !newPost.content && selectedImages.length === 0) {
      toast.error('Please add some content or images to your post');
      return;
    }

    try {
      let imageUrls: string[] = [];

      // Upload images if any are selected
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (file, index) => {
          const fileName = `${user.id}/${Date.now()}_${index}_${file.name}`;
          const { data, error } = await supabase.storage
            .from('device-images')
            .upload(fileName, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('device-images')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        imageUrls = await Promise.all(uploadPromises);
      }

      // Determine post type
      let postType = 'text';
      if (imageUrls.length > 0 && (newPost.title || newPost.content)) {
        postType = 'mixed';
      } else if (imageUrls.length > 0) {
        postType = 'image';
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          title: newPost.title || null,
          content: newPost.content || null,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          post_type: postType,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Post created successfully!');
      setNewPost({ title: '', content: '' });
      setSelectedImages([]);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error('Maximum 5 images allowed per post');
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const resetCreateForm = () => {
    setNewPost({ title: '', content: '' });
    setSelectedImages([]);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader />
      
      <main className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Community</h1>
          </div>
          
          <Button 
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="bg-gradient-primary hover:scale-105 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* Create New Post Card - Inline */}
        {isCreateOpen && (
          <div className="w-full flex justify-center">
            <Card className="w-full max-w-[600px] bg-card border shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground">Create New Post</h2>
                    <p className="text-sm text-muted-foreground mt-1">Share something with the community</p>
                  </div>
                  
                  <div className="space-y-4">
                    <Input
                      placeholder="Post title (optional)"
                      value={newPost.title}
                      onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newPost.content}
                      onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      className="w-full rounded-xl border-border bg-background px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    
                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload')?.click()}
                          className="flex items-center gap-2 rounded-xl px-6 py-2.5 border-border hover:bg-accent"
                          disabled={selectedImages.length >= 5}
                        >
                          <ImageIcon className="h-4 w-4" />
                          Upload Photos ({selectedImages.length}/5)
                        </Button>
                      </div>
                      
                      {/* Image Previews Grid */}
                      {selectedImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl">
                          {selectedImages.map((file, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-border"
                              />
                              <Button
                                type="button" 
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <Button 
                        onClick={createPost} 
                        className="w-full bg-primary hover:bg-primary/90 rounded-xl h-12 text-white font-semibold text-base transition-colors"
                      >
                        Share Post
                      </Button>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateOpen(false);
                            resetCreateForm();
                          }}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="bg-card border shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  {/* Post Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-medium">
                        {post.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {post.profiles?.display_name || 'Anonymous User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.title && (
                    <h3 className="font-bold text-lg mb-3 text-foreground">{post.title}</h3>
                  )}
                  {post.content && (
                    <p className="text-foreground mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  )}
                  
                  {/* Post Images */}
                  {post.image_urls && post.image_urls.length > 0 && (
                    <div className={`mb-4 ${post.image_urls.length === 1 ? '' : 'grid grid-cols-2 gap-3'}`}>
                      {post.image_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Post image ${index + 1}`}
                          className={`rounded-xl object-cover border border-border ${
                            post.image_urls!.length === 1 ? 'w-full h-64' : 'w-full h-32'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Engagement Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleLike(post.id, 'like')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-accent transition-colors group"
                      >
                        <ThumbsUp className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                          {post.like_count || 0}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => toggleLike(post.id, 'dislike')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-accent transition-colors group"
                      >
                        <ThumbsDown className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-destructive">
                          {post.dislike_count || 0}
                        </span>
                      </button>
                    </div>
                    
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-accent transition-colors group"
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                        {post.comment_count || 0}
                      </span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments === post.id && (
                    <div className="mt-6 pt-4 border-t border-border space-y-4">
                      {/* Add Comment */}
                      {user && (
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {user.email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex gap-2">
                            <Input
                              placeholder="Add a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="flex-1 rounded-xl border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  addComment(post.id);
                                }
                              }}
                            />
                            <Button
                              onClick={() => addComment(post.id)}
                              size="sm"
                              className="h-10 w-10 p-0 rounded-xl"
                              disabled={!newComment.trim()}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Comments List */}
                      {comments[post.id]?.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {comment.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-muted/50 rounded-xl px-4 py-3">
                              <p className="font-semibold text-sm mb-1">
                                {comment.profiles?.display_name || 'Anonymous'}
                              </p>
                              <p className="text-sm text-foreground">{comment.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </p>
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