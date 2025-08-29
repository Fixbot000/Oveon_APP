import { useState, useRef } from 'react';
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
import { OptimizedImage } from '@/components/OptimizedImage';
import { ImageWithSignedUrl } from '@/components/ImageWithSignedUrl';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useGlobalData } from '@/hooks/useGlobalData';

// Import types from the hooks
import type { Post, Comment } from '@/hooks/usePosts';

const Community = () => {
  const [newPost, setNewPost] = useState({ content: '' });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const lastPostTimeRef = useRef<number>(0);
  
  const { user, signOut } = useAuth();
  
  // Use global data store
  const {
    posts: allPosts,
    postLikes,
    userLikes,
    comments,
    loading,
    error,
    refreshData,
    handleLike,
    handleCreatePost: globalCreatePost,
    handleAddComment,
    clearError
  } = useGlobalData();
  
  // Filter posts based on showMyPosts
  const posts = showMyPosts && user?.id 
    ? allPosts.filter(post => post.user_id === user.id)
    : allPosts;

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
          .upload(objectPath, file, { 
            upsert: true, 
            cacheControl: '3600',
            contentType: file.type
          });
        if (error) {
          console.error('Storage upload error:', error);
          throw new Error(`Upload failed: ${error.message}`);
        }
        // Return the object path instead of public URL for security
        return objectPath;
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

  const handleLikeClick = (postId: string, likeType: 'like' | 'dislike') => {
    handleLike(postId, likeType);
  };

  const handleComment = async (postId: string) => {
    const content = newCommentContent[postId]?.trim();
    if (!content) return;

    const success = await handleAddComment(postId, content);
    if (success) {
      setNewCommentContent(prev => ({ ...prev, [postId]: '' }));
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
    if (user && Date.now() - lastPostTimeRef.current < 15 * 60 * 1000) {
      toast.error('Please wait 15 minutes before making another post.');
      return;
    }

    try {
      const imageUrls = await uploadSelectedImages();
      if (selectedImages.length > 0 && imageUrls.length === 0 && !newPost.content.trim()) {
        toast.error('Image upload failed');
        return;
      }

      const success = await globalCreatePost(newPost.content, imageUrls);
      if (success) {
        lastPostTimeRef.current = Date.now();
        setNewPost({ content: '' });
        setSelectedImages([]);
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
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
      refreshData();
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
      refreshData();
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
    <PullToRefresh onRefresh={refreshData} disabled={loading}>
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader onRefresh={() => void refreshData()} />
        
        {error && (
          <div className="px-4 py-2">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md text-sm flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      
      <main className="px-4 py-6 space-y-6">
        <div className="space-y-6">
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
            <Card className="max-w-2xl mx-auto text-left py-8">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
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
                      <div className="text-left mb-4">
                        <p className="text-foreground leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    )}

                    {(() => {
                      const images = post.image_urls?.length ? post.image_urls : (post.image_url ? [post.image_url] : []);
                      if (!images.length) return null;
                      
                      return (
                        <div className="space-y-3 mt-4">
                           {images.map((path, index) => (
                             <div key={index} className="w-full">
                               <ImageWithSignedUrl
                                 bucket="device-images"
                                 path={path}
                                 alt={`Post image ${index + 1}`}
                                 className="w-full max-h-96 object-cover rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                                  onClick={() => openImageDialog(path)}
                               />
                             </div>
                           ))}
                        </div>
                      );
                    })()}

                    {/* Like and Comment buttons */}
                    <div className="flex items-center space-x-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeClick(post.id, 'like')}
                        className={`flex items-center space-x-1 ${
                          userLikes[post.id] === 'like' ? 'text-red-500' : 'text-muted-foreground'
                        }`}
                      >
                        <Heart className="h-4 w-4" />
                        <span>{postLikes[post.id] || 0}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeClick(post.id, 'dislike')}
                        className={`flex items-center space-x-1 ${
                          userLikes[post.id] === 'dislike' ? 'text-destructive' : 'text-muted-foreground'
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          openCommentsSheet(post.id);
                        }}
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
                            onKeyPress={(e) => e.key === 'Enter' && handleComment(selectedPostIdForComments)}
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleComment(selectedPostIdForComments)}
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
    </PullToRefresh>
  );
};

export default Community;