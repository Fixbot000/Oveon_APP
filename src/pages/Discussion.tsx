import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Heart, Reply, Send, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  user_like?: 'like' | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  likes: number;
  dislikes: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
    ispremium: boolean;
  };
  user_like?: 'like' | null;
  replies?: Comment[];
}

type SortOption = 'top' | 'new' | 'most_liked';

const Discussion = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('top');
  const [loading, setLoading] = useState(true);

  const fetchPost = async () => {
    if (!postId) return;

    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            ispremium
          )
        `)
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Get user's like for the post
      let userLike = null;
      if (user) {
        const { data: likeData } = await supabase
          .from('post_likes')
          .select('like_type')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .single();
        
        userLike = likeData?.like_type || null;
      }

      setPost({ ...postData, user_like: userLike });
    } catch (error: any) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
    }
  };

  const fetchComments = async () => {
    if (!postId) return;

    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            ispremium
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: sortBy === 'new' ? false : true });

      if (commentsError) throw commentsError;

      // Get user's likes for comments
      let userLikes: any[] = [];
      if (user) {
        const { data: likesData } = await supabase
          .from('comment_likes')
          .select('comment_id, like_type')
          .eq('user_id', user.id);
        
        userLikes = likesData || [];
      }

      // Build nested comment structure
      const commentsWithLikes = commentsData?.map(comment => ({
        ...comment,
        user_like: userLikes.find(like => like.comment_id === comment.id)?.like_type || null,
        replies: []
      })) || [];

      // Sort comments based on selected option
      let sortedComments = [...commentsWithLikes];
      if (sortBy === 'top') {
        sortedComments.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
      } else if (sortBy === 'most_liked') {
        sortedComments.sort((a, b) => b.likes - a.likes);
      }

      // Build nested structure
      const topLevelComments = sortedComments.filter(c => !c.parent_id);
      const replies = sortedComments.filter(c => c.parent_id);

      topLevelComments.forEach(comment => {
        comment.replies = replies.filter(r => r.parent_id === comment.id);
      });

      setComments(topLevelComments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const handlePostLike = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      const currentPost = post;
      if (!currentPost) return;

      // Check if user already has a like on this post
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('like_type')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .eq('like_type', 'like')
        .maybeSingle();

      let likeDelta = 0;
      let newUserLike: 'like' | null = null;
      let newLikeCount = currentPost.likes;

      if (existingLike) {
        // Remove like (toggle off)
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        likeDelta = -1;
        newUserLike = null;
        newLikeCount = Math.max(0, currentPost.likes - 1); // Ensure never goes below 0
      } else {
        // Add new like
        await supabase
          .from('post_likes')
          .insert({
            user_id: user.id,
            post_id: postId,
            like_type: 'like'
          });
        
        likeDelta = 1;
        newUserLike = 'like';
        newLikeCount = currentPost.likes + 1;
      }

      // Update post count in database
      await supabase
        .from('posts')
        .update({
          likes: newLikeCount
        })
        .eq('id', postId);

      // Update local state immediately for better UX
      setPost(prevPost => prevPost ? {
        ...prevPost,
        likes: newLikeCount,
        user_like: newUserLike
      } : null);

      toast.success(newUserLike ? 'Post liked!' : 'Like removed');
    } catch (error: any) {
      console.error('Error handling like:', error);
      toast.error('Failed to update like');
      // Refresh data on error
      fetchPost();
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    try {
      const comment = comments.find(c => c.id === commentId) || 
                     comments.flatMap(c => c.replies || []).find(r => r.id === commentId);
      
      if (!comment) return;

      // Check if user already has a like on this comment
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('like_type')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .eq('like_type', 'like')
        .maybeSingle();

      let likeDelta = 0;
      let newUserLike: 'like' | null = null;
      let newLikeCount = comment.likes;

      if (existingLike) {
        // Remove like (toggle off)
        await supabase
          .from('comment_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('comment_id', commentId);
        
        likeDelta = -1;
        newUserLike = null;
        newLikeCount = Math.max(0, comment.likes - 1); // Ensure never goes below 0
      } else {
        // Add new like
        await supabase
          .from('comment_likes')
          .insert({
            user_id: user.id,
            comment_id: commentId,
            like_type: 'like'
          });
        
        likeDelta = 1;
        newUserLike = 'like';
        newLikeCount = comment.likes + 1;
      }

      // Update comment count in database
      await supabase
        .from('comments')
        .update({
          likes: newLikeCount
        })
        .eq('id', commentId);

      // Update local state immediately
      setComments(prevComments => 
        prevComments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              likes: newLikeCount,
              user_like: newUserLike
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r => 
                r.id === commentId 
                  ? {
                      ...r,
                      likes: newLikeCount,
                      user_like: newUserLike
                    }
                  : r
              )
            };
          }
          return c;
        })
      );

      toast.success(newUserLike ? 'Comment liked!' : 'Like removed');
    } catch (error: any) {
      console.error('Error handling comment like:', error);
      toast.error('Failed to update like');
      fetchComments();
    }
  };

  const addComment = async () => {
    if (!user || !postId) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          text: newComment.trim(),
          parent_id: null
        });

      if (error) throw error;

      setNewComment('');
      toast.success('Comment added!');
      fetchComments();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const addReply = async (parentId: string) => {
    if (!user || !postId) {
      toast.error('Please sign in to reply');
      return;
    }

    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          text: replyText.trim(),
          parent_id: parentId
        });

      if (error) throw error;

      setReplyText('');
      setReplyTo(null);
      toast.success('Reply added!');
      fetchComments();
    } catch (error: any) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-border pl-4' : ''}`}>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className={`h-8 w-8 ${comment.profiles?.ispremium ? 'ring-2 ring-amber-400' : ''}`}>
              {comment.profiles?.avatar_url && (
                <img 
                  src={comment.profiles.avatar_url} 
                  alt="User avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {comment.profiles?.username || 'Anonymous User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <p className="text-sm mb-3">{comment.text}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCommentLike(comment.id)}
                className={`flex items-center space-x-1 h-7 px-2 transition-colors ${
                  comment.user_like === 'like' ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'
                }`}
              >
                <Heart className={`h-3 w-3 ${comment.user_like === 'like' ? 'fill-current' : ''}`} />
                <span className="text-xs">{comment.likes}</span>
              </Button>
            </div>
            {!isReply && user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="flex items-center space-x-1 h-7 px-2"
              >
                <Reply className="h-3 w-3" />
                <span className="text-xs">Reply</span>
              </Button>
            )}
          </div>

          {replyTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="text-sm"
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => addReply(comment.id)}
                  disabled={!replyText.trim()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyTo(null);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {comment.replies?.map(reply => renderComment(reply, true))}
    </div>
  );

  useEffect(() => {
    if (postId) {
      setLoading(true);
      Promise.all([fetchPost(), fetchComments()]).finally(() => setLoading(false));
    }
  }, [postId, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Post not found</h2>
          <Button onClick={() => navigate('/community')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/community')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <h1 className="text-lg font-semibold">Discussion</h1>
        <div className="w-16"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Original Post */}
        <Card>
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
                <p className="font-semibold">
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

            <p className="mb-4">{post.text}</p>

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
                  onClick={() => handlePostLike(post.id)}
                  className={`flex items-center space-x-1 transition-colors ${
                    post.user_like === 'like' ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${post.user_like === 'like' ? 'fill-current' : ''}`} />
                  <span>{post.likes}</span>
                </Button>
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{post.views}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Comment */}
        {user && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Join the discussion..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button 
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="most_liked">Most Liked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {comments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No comments yet. Be the first to join the discussion!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => renderComment(comment))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Discussion;