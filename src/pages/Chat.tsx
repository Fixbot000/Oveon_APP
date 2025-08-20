import { useState } from 'react';
import { Send, Mic, Camera, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
}

const Chat = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi there 👋 I'm your AI Repair Assistant! I can help you diagnose and fix electronic devices.

You can:
• Describe your device issues here for instant help
• Use the Scan feature for image-based diagnosis
• Ask about specific symptoms or problems

What device do you need help with today?`,
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

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = message.trim();
    const newMessageId = Date.now();
    
    // Add user message
    setMessages(prev => [
      ...prev,
      { id: newMessageId, text: userMessage, isBot: false }
    ]);
    
    // Add loading message
    const loadingId = newMessageId + 1;
    setMessages(prev => [
      ...prev,
      { id: loadingId, text: 'Analyzing your issue...', isBot: true, isLoading: true }
    ]);
    
    setMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('text-diagnosis', {
        body: {
          message: userMessage,
          conversationHistory: conversationHistory
        }
      });

      if (error) throw error;

      // Remove loading message and add AI response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingId);
        return [
          ...filtered,
          { 
            id: Date.now(), 
            text: data.response || 'I apologize, but I encountered an issue processing your request. Please try again.',
            isBot: true,
            hasMatches: data.hasMatches
          }
        ];
      });

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.response }
      ]);

      if (data.hasMatches) {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now() + 1,
              text: `💡 I found ${data.databaseMatches} matching entries in our repair database that might help with your issue!`,
              isBot: true
            }
          ]);
        }, 1000);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingId);
        return [
          ...filtered,
          { 
            id: Date.now(), 
            text: 'I apologize, but I\'m having trouble processing your request right now. Please try again or use the Scan feature for image-based diagnosis.',
            isBot: true
          }
        ];
      });
      
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setMessage(action);
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
        <div className="flex gap-3 max-w-md mx-auto">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your device issue..."
              className="pr-12 h-12 bg-card"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
              disabled
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            onClick={handleSendMessage} 
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

      <BottomNavigation />
    </div>
  );
};

export default Chat;