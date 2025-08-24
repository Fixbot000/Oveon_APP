import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Plus, Send, Users, Image as ImageIcon, X, Zap, Heart, MessageCircle, ThumbsUp, ThumbsDown, Edit, Trash2, Check, X as XIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

interface Post {
  id: string;
  content: string;
  image_urls: string[] | null;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
  };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  parent_comment_id?: string | null;
}

const Community = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState({ content: '' });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [postLikes, setPostLikes] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const lastPostTimeRef = useRef<number>(0); // Using useRef to persist last post time across renders
  const { user, signOut } = useAuth();

  useEffect(() => {
    loadPosts();
  }, [showMyPosts]); // Re-load posts when filter changes

  const uploadSelectedImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];

    if (!user) {
      toast.error('Please sign in to upload images');
      return [];
    }

    const now = Date.now();
    const uploads = selectedImages.map((file, index) => {
      const extension = file.name.split('.').pop() || 'jpg';
      const objectPath = `${user.id}/${now}_${index}.${extension}`;
      return { file, objectPath };
    });

    const results = await Promise.allSettled(
      uploads.map(async ({ file, objectPath }) => {
        const { error } = await supabase.storage
          .from('device-images')
          .upload(objectPath, file, { upsert: false, cacheControl: '3600' });
        if (error) {
          console.error('Storage upload error:', error.message || error.name || error);
          throw error;
        }
        const { data } = supabase.storage
          .from('device-images')
          .getPublicUrl(objectPath);
        return data?.publicUrl || '';
      })
    );

    const successfulUrls = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => (r as PromiseFulfilledResult<string>).value);

    const failedCount = results.filter(r => r.status === 'rejected').length;
    if (failedCount > 0) {
      toast.error(`Failed to upload ${failedCount} image${failedCount > 1 ? 's' : ''}`);
    }

    return successfulUrls;
  };

  const openImageDialog = (imageUrl: string) => {
    setExpandedImage(imageUrl);
    setIsImageDialogOpen(true);
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (showMyPosts && user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data: postsData, error } = await query;

      if (error) throw error;

      // Get user profiles separately to avoid the join issue
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      // Map profiles to posts
      const postsWithProfiles = postsData?.map(post => ({
        ...post,
        profiles: profilesData?.find(p => p.id === post.user_id)
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
        .select('*, profiles(username, avatar_url)') // Fetch profile for each comment
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      const commentsByPost: Record<string, Comment[]> = {};
      commentsData?.forEach(comment => {
        if (!commentsByPost[comment.post_id]) {
          commentsByPost[comment.post_id] = [];
        }
        commentsByPost[comment.post_id].push(comment as Comment);
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

  const handleComment = async (postId: string, parentCommentId: string | null = null) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const content = newCommentContent[postId]?.trim();
    if (!content) return;

    try {
      await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId, // Add parent_comment_id
        });

      setNewCommentContent(prev => ({ ...prev, [postId]: '' }));
      await loadPostLikesAndComments([postId]); // Reload comments for the specific post
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

    if (!newPost.content.trim() && selectedImages.length === 0) {
      toast.error('Add text or at least one image');
      return;
    }

    // Implement 15-minute cooldown for posting
    if (user && Date.now() - lastPostTimeRef.current < 15 * 60 * 1000) { // 15 minutes in milliseconds
      toast.error('Please wait 15 minutes before making another post.');
      return;
    }

    try {
      const imageUrls = await uploadSelectedImages();
      // If user selected images but none uploaded and there's no text, block
      if (selectedImages.length > 0 && imageUrls.length === 0 && !newPost.content.trim()) {
        toast.error('Image upload failed');
        return;
      }

      const insertData: any = {
        content: newPost.content,
        user_id: user.id,
      };
      if (imageUrls.length > 0) {
        insertData.image_urls = imageUrls;
        // post_type exists in some schemas; ignore if column missing
        insertData.post_type = newPost.content.trim() ? 'mixed' : 'image';
      }

      let { error } = await supabase
        .from('posts')
        .insert(insertData);

      if (error) throw error;

      toast.success('Post created successfully!');
      lastPostTimeRef.current = Date.now(); // Update last post time on successful post
      setNewPost({ content: '' });
      setSelectedImages([]);
      loadPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      const message = error?.message || 'Failed to create post';
      toast.error(message);
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

  const handleEditPost = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to edit posts');
      return;
    }

    if (!editContent.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent })
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      setEditingPost(null);
      setEditContent('');
      toast.success('Post updated successfully!');
      loadPosts();
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to delete posts');
      return;
    }

    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Post deleted successfully!');
      loadPosts();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const startEditing = (post: Post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
  };

  const cancelEditing = () => {
    setEditingPost(null);
    setEditContent('');
  };

  const openCommentsSheet = (postId: string) => {
    setSelectedPostIdForComments(postId);
    setIsCommentsSheetOpen(true);
  };

  const closeCommentsSheet = () => {
    setIsCommentsSheetOpen(false);
    setSelectedPostIdForComments(null);
    setNewCommentContent({}); // Clear new comment content when closing sheet
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader onRefresh={loadPosts} />
      
      <main className="px-4 py-6 space-y-6">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Community</h1>
            <div className="flex space-x-2">
              {user && (
                <Button 
                  onClick={() => setShowMyPosts(prev => !prev)}
                  variant={showMyPosts ? "default" : "outline"}
                  size="sm"
                >
                  {showMyPosts ? "All Posts" : "My Posts"}
                </Button>
              )}
              {user && (
                <Button onClick={signOut} variant="outline" size="sm">
                  Sign Out
                </Button>
              )}
            </div>
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
                  disabled={!newPost.content.trim() && selectedImages.length === 0}
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
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
                      
                      {/* Edit and Delete buttons for post owner */}
                      {user && user.id === post.user_id && (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(post)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Post content or edit form */}
                    {editingPost === post.id ? (
                      <div className="space-y-3 mb-4">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[100px] w-full resize-none"
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleEditPost(post.id)}
                            size="sm"
                            disabled={!editContent.trim()}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            variant="outline"
                            size="sm"
                          >
                            <XIcon className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground mb-4 leading-relaxed">
                        {post.content}
                      </p>
                    )}

                    {post.image_urls && post.image_urls.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                        {post.image_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Post image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer"
                            onClick={() => openImageDialog(url)}
                          />
                        ))}
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
                        onClick={() => openCommentsSheet(post.id)}
                        className="flex items-center space-x-1 text-muted-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{comments[post.id]?.length || 0}</span>
                      </Button>
                    </div>

                    {/* No longer showing comments directly in the card */}
                    {/* {showComments[post.id] && (...) } */}

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />

      {/* Image Expansion Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Expanded Image</DialogTitle>
          </DialogHeader>
          {expandedImage && (
            <img src={expandedImage} alt="Expanded Post Image" className="w-full h-auto object-contain" />
          )}
        </DialogContent>
      </Dialog>

      {/* Comments Sheet */}
      <Sheet open={isCommentsSheetOpen} onOpenChange={closeCommentsSheet}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Comments</SheetTitle>
            <SheetDescription>Comments for the selected post.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedPostIdForComments && comments[selectedPostIdForComments] && (
              comments[selectedPostIdForComments]
                .filter(comment => !comment.parent_comment_id) // Only show top-level comments initially
                .map(comment => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/40 p-3 rounded-lg">
                      <p className="text-sm font-semibold">{comment.profiles?.username || 'Anonymous'}</p>
                      <p className="text-sm text-foreground">{comment.content}</p>
                      {/* Display replies */}
                      {comments[selectedPostIdForComments].filter(reply => reply.parent_comment_id === comment.id).map(reply => (
                        <div key={reply.id} className="flex space-x-2 mt-3 ml-6 bg-muted/30 p-2 rounded-lg">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {reply.profiles?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-xs font-semibold">{reply.profiles?.username || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                      {/* Reply input for top-level comments */}
                      {user && (
                        <div className="flex space-x-2 mt-3">
                          <Input
                            placeholder="Reply to this comment..."
                            value={newCommentContent[`${selectedPostIdForComments}-${comment.id}`] || ''}
                            onChange={(e) => setNewCommentContent(prev => ({ ...prev, [`${selectedPostIdForComments}-${comment.id}`]: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && handleComment(selectedPostIdForComments, comment.id)}
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleComment(selectedPostIdForComments, comment.id)}
                            disabled={!newCommentContent[`${selectedPostIdForComments}-${comment.id}`]?.trim()}
                          >
                            Reply
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
            {!selectedPostIdForComments || !comments[selectedPostIdForComments] || comments[selectedPostIdForComments].filter(comment => !comment.parent_comment_id).length === 0 ? (
              <p className="text-center text-muted-foreground">No comments yet. Be the first to comment!</p>
            ) : null}
          </div>
          {/* Main comment input for the post */}
          {user && selectedPostIdForComments && (
            <div className="p-4 border-t bg-background flex space-x-2">
              <Input
                placeholder="Add a comment..."
                value={newCommentContent[selectedPostIdForComments] || ''}
                onChange={(e) => setNewCommentContent(prev => ({ ...prev, [selectedPostIdForComments]: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleComment(selectedPostIdForComments)}
              />
              <Button 
                size="sm" 
                onClick={() => handleComment(selectedPostIdForComments)}
                disabled={!newCommentContent[selectedPostIdForComments]?.trim()}
              >
                Send
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Community;