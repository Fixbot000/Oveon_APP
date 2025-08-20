import { useState } from 'react';
import { Send, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hi there 👋, I'm your Repair Assistant. What device do you want help with today?`,
      isBot: true,
    }
  ]);

  const quickActions = [
    'Battery issues',
    'Charging problems', 
    'Screen not working'
  ];

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: message, isBot: false }
    ]);
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} />
      
      <main className="px-4 py-6 space-y-6">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
              <Card className={`max-w-[80%] ${msg.isBot ? 'bg-gradient-primary' : 'bg-card'}`}>
                <CardContent className="p-4">
                  <p className={`text-sm ${msg.isBot ? 'text-white' : 'text-foreground'}`}>
                    {msg.text}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {messages.length === 1 && (
          <>
            <Card className="bg-card">
              <CardContent className="p-4">
                <p className="text-center text-foreground">My laptop isn't turning on</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => setMessage(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </>
        )}
      </main>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="flex gap-3 max-w-md mx-auto">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your issue..."
              className="pr-12 h-12"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleSendMessage} className="h-12 w-12" size="icon">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Chat;