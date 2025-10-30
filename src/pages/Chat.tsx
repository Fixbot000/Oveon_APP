import { useState } from 'react';
import { Send, Mic, Camera, Loader2, AlertCircle, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { useRef, useEffect } from 'react'; // Import useRef and useEffect
import PremiumUpsell from '@/components/PremiumUpsell'; // Import the new component
import MobileHeader from '@/components/MobileHeader'; // Import MobileHeader
// import ScopeBanner from '@/components/ScopeBanner'; // ScopeBanner removed per request
import { useRefresh } from '@/hooks/useRefresh'; // Import useRefresh hook

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  isLoading?: boolean;
  hasMatches?: boolean;
  followUpQuestions?: string[];
  usedFallback?: boolean;
}

const initialMessages: Message[] = [
  {
    id: 1,
    text: `Hi there! 👋 I\'m your friendly Repair Assistant!\n\nI\'m here to help you troubleshoot and fix your electronic devices with step-by-step guidance. Whether it\'s a smartphone, laptop, appliance, or any other gadget, I\'ll do my best to get it working again! 🔧✨\n\n**What I can help with:**\n• 📱 Smartphones & tablets\n• 💻 Laptops & computers  \n• 🏠 Home appliances\n• 🎮 Gaming consoles\n• 🔊 Audio/video equipment\n• ⚡ Basic electrical issues\n\nJust describe your problem and I\'ll guide you through the repair process. Let\'s fix it together! 💪`,
    isBot: true,
  }
];

const Chat = () => {
  const navigate = useNavigate();
  const { isPremium, user } = useAuth(); // Destructure isPremium and user
  const [message, setMessage] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>(() => {
    const storedHistory = localStorage.getItem('chatConversationHistory');
    return storedHistory ? JSON.parse(storedHistory) : [];
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      return JSON.parse(storedMessages);
    } else {
      return initialMessages;
    }
  });
  const [projects, setProjects] = useState<any[]>(() => {
    const storedProjects = localStorage.getItem('projects');
    return storedProjects ? JSON.parse(storedProjects) : [];
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false); 

  const handleUpdateProject = (updatedProject: any) => {
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

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

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('chatConversationHistory', JSON.stringify(conversationHistory));
  }, [conversationHistory]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  // Consume refresh context and trigger local handleRefresh
  const { refreshTrigger } = useRefresh();
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Chat page detected global refresh. Clearing chat history.');
      handleRefresh();
    }
  }, [refreshTrigger]);

  const handleCreateProject = (projectName: string, description: string, files: File[]) => {
    const newProject: any = {
      id: String(Date.now()), // Unique ID for the project
      title: projectName,
      description: description,
      lastUpdated: new Date().toISOString().split('T')[0], // Current date
      chatHistory: [], // Initialize chat history for the new project
      // Files are handled within the CreateProjectForm or uploaded separately
    };
    setProjects((prevProjects) => [...prevProjects, newProject]);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prevProjects) => prevProjects.filter(project => project.id !== projectId));
  };

  const handleRefresh = () => {
    setMessages(initialMessages);
    setConversationHistory([]);
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatConversationHistory');
    setIsLoading(false);
    setPendingQuestions([]);
    setMessage('');
    setDetailedDescription('');
    setShowDescription(false);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ScopeBanner removed per request */}
      <main className="px-4 py-6 space-y-4 pb-32 bg-background">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <Card className={`max-w-[85%] ${msg.isBot ? 'bg-muted text-muted-foreground shadow-md' : 'bg-primary text-primary-foreground'}
                  rounded-xl px-4 py-3 my-1 mx-0`}>
                  <CardContent className="p-0">
                    <div className="flex items-start gap-2">
                      {msg.isLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-foreground mt-0.5 flex-shrink-0" />
                      )}
                      {msg.hasMatches && !msg.isLoading && (
                        <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-sm whitespace-pre-wrap">
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
                <div className="bg-muted text-muted-foreground px-3 py-2 rounded-xl inline-flex items-center space-x-1">
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
            <Card className="bg-card border-border">
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
                      className="w-full text-left justify-start h-auto p-3 bg-background hover:bg-muted border-border"
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

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border">
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
                  placeholder="Provide additional details about your device issue, symptoms, when it started, what you\'ve tried, etc."
                  className="min-h-[80px] bg-background border border-input focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                />
              </CardContent>
            </Card>
          )}

          {/* Only show chat input if activeTab is 'repairBot' */}
          {/* This block is now always rendered */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your device issue..."
                className="pr-20 h-12 bg-card border border-input focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
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
              className="h-12 w-12 bg-primary text-primary-foreground"
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

      <BottomNavigation isCreateProjectModalOpen={isCreateProjectModalOpen} />
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
    background-color: hsl(var(--muted-foreground));
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