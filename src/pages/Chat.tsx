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
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { useRef, useEffect } from 'react'; // Import useRef and useEffect

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
  const { isPremium } = useAuth(); // Destructure isPremium
  const [message, setMessage] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi there! 👋 I'm your friendly Repair Assistant!

I'm here to help you troubleshoot and fix your electronic devices with step-by-step guidance. Whether it's a smartphone, laptop, appliance, or any other gadget, I'll do my best to get it working again! 🔧✨

**What I can help with:**
• 📱 Smartphones & tablets
• 💻 Laptops & computers  
• 🏠 Home appliances
• 🎮 Gaming consoles
• 🔊 Audio/video equipment
• ⚡ Basic electrical issues

Just describe your problem and I'll guide you through the repair process. Let's fix it together! 💪`,
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
      console.log('Sending message to repair bot:', fullMessage);
      
      const { data, error } = await supabase.functions.invoke('chat-repair-bot', {
        body: {
          message: fullMessage,
          conversationHistory: conversationHistory
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to get response from repair bot');
      }

      if (!data.success) {
        throw new Error(data.error || 'Repair bot returned an error');
      }

      console.log('Repair bot response received:', data.response);

      // Update conversation history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: fullMessage },
        { role: 'assistant', content: data.response }
      ];
      setConversationHistory(newHistory);

      // Remove loading message and add AI response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingId);
        return [
          ...filtered,
          { 
            id: Date.now(), 
            text: data.response,
            isBot: true,
            hasMatches: true
          }
        ];
      });

      toast.success('Got repair guidance! 🔧');

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingId);
        return [
          ...filtered,
          { 
            id: Date.now(), 
            text: `I'm having trouble connecting right now. 😅 This might be because the OpenAI API key isn't configured yet. Please check back later or contact support if this persists!`,
            isBot: true
          }
        ];
      });
      
      toast.error('Unable to connect to repair assistant');
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="min-h-screen bg-background pb-20">
              <MobileHeader onRefresh={() => window.location.reload()} isPremium={isPremium} showBackButton={true} backButtonTarget="/"/>
      
      <main className="px-4 py-6 space-y-4 pb-32">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
              <Card className={`max-w-[85%] ${msg.isBot ? 'bg-gray-100 text-gray-800 shadow-md' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'}
                rounded-xl px-4 py-3 my-1 mx-0`}>
                <CardContent className="p-0">
                  <div className="flex items-start gap-2">
                    {msg.isLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-foreground mt-0.5 flex-shrink-0" />
                    )}
                    {msg.hasMatches && !msg.isLoading && (
                      <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    <p className={`text-sm whitespace-pre-wrap ${msg.isBot ? 'text-gray-800' : 'text-white'}`}>
                      {msg.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-600 px-3 py-2 rounded-xl inline-flex items-center space-x-1">
                <div className="dot-animation">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Follow-up Questions */}
        {pendingQuestions.length > 0 && (
          <Card className="bg-card border-blue-200">
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
            <Card className="bg-card shadow-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-foreground font-medium mb-3">Need visual diagnosis?</p>
                <Button 
                  onClick={() => navigate('/scan')}
                  className="w-full bg-primary text-primary-foreground"
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
                  className="h-auto p-4 text-left justify-start bg-card shadow-card hover:shadow-elevated transition-all border-border"
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
              className="h-12 w-12 bg-primary" 
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

const style = document.createElement('style');
style.innerHTML = `
  @keyframes dot-pulse {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .dot-animation .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: #6B7280; /* gray-600 */
    border-radius: 50%;
    animation: dot-pulse 1.4s infinite ease-in-out both;
  }

  .dot-animation .dot:nth-child(1) {
    animation-delay: -0.32s;
  }

  .dot-animation .dot:nth-child(2) {
    animation-delay: -0.16s;
  }

  .dot-animation .dot:nth-child(3) {
    animation-delay: 0s;
  }
`;
document.head.appendChild(style);