import { useState } from 'react';
import { Send, Mic, Camera, Loader2, AlertCircle, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  isLoading?: boolean;
  hasMatches?: boolean;
  followUpQuestions?: string[];
  usedFallback?: boolean;
}

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi there! 👋 I'm your Repair Assistant!

**Note:** The AI chat feature is currently unavailable as the diagnostic pipeline has been removed.

However, you can still:
• Browse our repair database in the Community section
• View repair history and tips
• Access component and device information

The AI features will be restored in a future update. Thank you for your patience!`,
      isBot: true,
    }
  ]);

  const quickActions = [
    'My phone won\'t charge',
    'Laptop screen is black', 
    'Device won\'t turn on',
    'Strange noises from device',
    'Overheating issues',
    'Display problems'
  ];

  const handleSendMessage = async (skipQuestions = false) => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = message.trim();
    const fullMessage = detailedDescription 
      ? `${userMessage}\n\nAdditional details: ${detailedDescription}`
      : userMessage;
    const newMessageId = Date.now();
    
    // Add user message
    setMessages(prev => [
      ...prev,
      { 
        id: newMessageId, 
        text: detailedDescription 
          ? `${userMessage}\n\n📝 Additional details: ${detailedDescription}`
          : userMessage, 
        isBot: false 
      }
    ]);
    
    // Add loading message
    const loadingId = newMessageId + 1;
    const loadingText = conversationHistory.length === 0 
      ? 'Analyzing your issue with AI...' 
      : 'Thinking...';
    
    setMessages(prev => [
      ...prev,
      { id: loadingId, text: loadingText, isBot: true, isLoading: true }
    ]);
    
    setMessage('');
    setDetailedDescription('');
    setShowDescription(false);
    setIsLoading(true);

    try {
      // Note: text-diagnosis function was removed with AI pipeline
      // This is a placeholder that will fail gracefully
      throw new Error('AI pipeline has been removed');
    } catch (error) {

      console.error('Chat error:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingId);
        return [
          ...filtered,
          { 
            id: Date.now(), 
            text: 'The AI chat feature is temporarily unavailable as the diagnostic pipeline has been removed. Please check back later!',
            isBot: true
          }
        ];
      });
      
      toast.error('AI chat is currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSelect = (question: string) => {
    setMessage(question);
    setPendingQuestions([]);
  };

  const handleSkipQuestions = () => {
    setPendingQuestions([]);
    toast.success('Questions skipped! Feel free to describe your issue directly.');
  };

  const handleQuickAction = (action: string) => {
    setMessage(action);
  };

  const handleSendClick = () => {
    handleSendMessage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} />
      
      <main className="px-4 py-6 space-y-4 pb-32">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
              <Card className={`max-w-[85%] ${
                msg.isBot 
                  ? msg.hasMatches 
                    ? 'bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-200' 
                    : 'bg-gradient-primary' 
                  : 'bg-card'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {msg.isLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-white mt-0.5 flex-shrink-0" />
                    )}
                    {msg.hasMatches && !msg.isLoading && (
                      <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    <p className={`text-sm whitespace-pre-wrap ${
                      msg.isBot ? 'text-white' : 'text-foreground'
                    }`}>
                      {msg.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Follow-up Questions */}
        {pendingQuestions.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground">
                  I have some follow-up questions to help you better:
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipQuestions}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip questions
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {pendingQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-3 bg-background/50 hover:bg-background"
                    onClick={() => handleQuestionSelect(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {messages.length === 1 && (
          <div className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-4 text-center">
                <p className="text-foreground font-medium mb-3">Need visual diagnosis?</p>
                <Button 
                  onClick={() => navigate('/scan')}
                  className="w-full bg-gradient-primary text-white"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photos for AI Analysis
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3">
              <p className="text-sm text-muted-foreground text-center mb-2">
                Or try these common issues:
              </p>
              {quickActions.map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start bg-gradient-card shadow-card hover:shadow-elevated transition-all"
                  onClick={() => handleQuickAction(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="space-y-4 max-w-md mx-auto">
          {/* Description Box */}
          {showDescription && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Additional Details
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDescription(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  placeholder="Provide additional details about your device issue, symptoms, when it started, what you've tried, etc."
                  className="min-h-[80px] bg-background"
                />
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your device issue..."
                className="pr-20 h-12 bg-card"
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowDescription(!showDescription)}
                  title="Add detailed description"
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled
                  title="Voice input (coming soon)"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleSendClick}
              className="h-12 w-12 bg-gradient-primary" 
              size="icon"
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Chat;