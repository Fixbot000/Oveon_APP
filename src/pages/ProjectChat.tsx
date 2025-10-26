import { useParams } from "react-router-dom";
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Info, Users, FileText, ListChecks, MessageSquareMore, ArrowUp } from 'lucide-react'; // Import new icons

interface ProjectChatProps {
  isScrolled: boolean;
}

interface ProjectFile {
  id: string;
  name: string;
  type: string; // e.g., 'pdf', 'doc', 'image'
  url: string;
}

interface ProjectMember {
  id: string;
  name: string;
  role: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  files?: ProjectFile[];
  members?: ProjectMember[];
  chatHistory?: {
    id: number;
    sender: 'user' | 'ai';
    text: string;
  }[];
}

const ProjectChat = ({ isScrolled }: ProjectChatProps) => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<{
    id: number;
    sender: 'user' | 'ai';
    text: string;
  }[]>([]); // Initialize with an empty array
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        if (scrollTop > 100 && scrollHeight - scrollTop - clientHeight < 100) {
          setShowScrollToTop(true);
        } else {
          setShowScrollToTop(false);
        }
      }
    };

    const currentChatContainer = chatContainerRef.current;
    if (currentChatContainer) {
      currentChatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (currentChatContainer) {
        currentChatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Fetch all project details from localStorage
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) {
      const projects: Project[] = JSON.parse(storedProjects);
      setAllProjects(projects);
      const foundProject = projects.find(p => p.id === projectId);
      setProject(foundProject || null);
      if (foundProject?.chatHistory && foundProject.chatHistory.length > 0) {
        setMessages(foundProject.chatHistory);
      } else {
        setMessages([ // Default initial message with Jarvis personality
          { id: 1, sender: 'ai', text: "Good day! I'm Jarvis, your project assistant. I'm here to help you with this project. How can I assist you today?" },
        ]);
      }
    }
  }, [projectId]);

  const navigate = useNavigate();
  const { isPremium } = useAuth();

  const handleSwitchToProjects = () => {
    navigate('/chat'); // Navigate back to the projects view
  };

  const handleSelectProject = (id: string) => {
    navigate(`/project/${id}/chat`);
  };

  const handleRefresh = () => {
    // Re-fetch project chat history from localStorage
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) {
      const projects: Project[] = JSON.parse(storedProjects);
      const foundProject = projects.find(p => p.id === projectId);
      if (foundProject?.chatHistory) {
        setMessages(foundProject.chatHistory);
      } else {
        setMessages([ // Default initial message with Jarvis personality
          { id: 1, sender: 'ai', text: "Good day! I'm Jarvis, your project assistant. I'm here to help you with this project. How can I assist you today?" },
        ]);
      }
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const newUserMessage = { id: Date.now(), sender: 'user' as const, text: inputMessage };
    const updatedMessagesAfterUser = [...messages, newUserMessage];
    setMessages(updatedMessagesAfterUser);
    const userMessage = inputMessage;
    setInputMessage('');

    // Update project in localStorage immediately after user sends message
    if (project) {
      const updatedProjects = allProjects.map(p =>
        p.id === projectId ? { ...p, chatHistory: updatedMessagesAfterUser } : p
      );
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      setAllProjects(updatedProjects);
    }

    // Show thinking indicator
    const thinkingMessage = { id: Date.now() + 1, sender: 'ai' as const, text: "Thinking..." };
    const updatedMessagesWithThinking = [...updatedMessagesAfterUser, thinkingMessage];
    setMessages(updatedMessagesWithThinking);
    scrollToBottom();

    try {
      // Call ChatGPT with project context
      const { data, error } = await supabase.functions.invoke('project-chat-ai', {
        body: {
          projectId: projectId,
          message: userMessage,
          projectContext: project
        }
      });

      if (error) throw error;

      if (data?.success && data?.reply) {
        // Replace thinking message with AI response
        const aiResponseMessage = { 
          id: Date.now() + 2, 
          sender: 'ai' as const, 
          text: data.reply 
        };
        
        const finalMessages = [...updatedMessagesAfterUser, aiResponseMessage];
        setMessages(finalMessages);
        scrollToBottom();

        // Update project in localStorage with final messages
        if (project) {
          const finalUpdatedProjects = allProjects.map(p =>
            p.id === projectId ? { ...p, chatHistory: finalMessages } : p
          );
          localStorage.setItem('projects', JSON.stringify(finalUpdatedProjects));
          setAllProjects(finalUpdatedProjects);
        }
      } else {
        // Handle error case
        throw new Error(data?.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error calling project chat AI:', error);
      
      // Replace thinking message with error message
      const errorMessage = { 
        id: Date.now() + 2, 
        sender: 'ai' as const, 
        text: "I apologize, but I'm having trouble connecting right now. Please try again in a moment." 
      };
      
      const finalMessages = [...updatedMessagesAfterUser, errorMessage];
      setMessages(finalMessages);
      scrollToBottom();

      // Update project in localStorage
      if (project) {
        const finalUpdatedProjects = allProjects.map(p =>
          p.id === projectId ? { ...p, chatHistory: finalMessages } : p
        );
        localStorage.setItem('projects', JSON.stringify(finalUpdatedProjects));
        setAllProjects(finalUpdatedProjects);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-card p-4 border-b border-border flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={() => navigate('/chat?tab=projects')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1 text-center">Chat for Project {project ? project.title : projectId}</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-card text-foreground border-r-0 rounded-r-xl shadow-lg">
              <SheetHeader className="pb-4 pt-6 px-4">
                <SheetTitle className="text-foreground text-3xl font-bold tracking-tight">Project Details</SheetTitle>
              </SheetHeader>
              {project && (
                <div className="mt-4 space-y-6">
                  <div className="px-4">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><Info className="h-5 w-5"/></span>
                      Project Info
                    </h4>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    <p className="text-xs text-muted-foreground">Last Updated: {project.lastUpdated}</p>
                  </div>
                  <Separator className="bg-border" />
                  <div className="px-4">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><Users className="h-5 w-5"/></span>
                      Members
                    </h4>
                    <ul>
                      {project.members && project.members.length > 0 ? (
                        project.members.map(member => (
                          <li key={member.id} className="text-sm text-muted-foreground">{member.name} ({member.role})</li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">No members added.</li>
                      )}
                    </ul>
                  </div>
                  <Separator className="bg-border" />
                  <div className="px-4">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><FileText className="h-5 w-5"/></span>
                      Uploaded Files:
                    </h4>
                    {project.files && project.files.length > 0 ? (
                      <ul className="space-y-1">
                        {project.files.map(file => (
                          <li key={file.id} className="text-sm text-muted-foreground">
                             {file.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">No files uploaded yet.</p>
                    )}
                  </div>
                  <Separator className="bg-border" />
                  <div className="px-4">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><ListChecks className="h-5 w-5"/></span>
                      To-Do Checklist
                    </h4>
                    <p className="text-sm text-muted-foreground">Task 1: Complete (✅)</p>
                    <p className="text-sm text-muted-foreground">Task 2: In Progress (⏳)</p>
                    {/* Placeholder for dynamic to-do list */}
                  </div>
                  <Separator className="bg-border" />
                  <div className="px-4">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><MessageSquareMore className="h-5 w-5"/></span>
                      Switch to Other Project
                    </h4>
                    {allProjects.length > 0 ? (
                      <ul className="space-y-1 mt-3">
                        {allProjects.filter(p => p.id !== project.id).map(p => (
                          <li key={p.id}>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start h-auto py-2 px-3 text-foreground hover:bg-muted focus:bg-accent transition-all duration-200 rounded-md"
                              onClick={() => handleSelectProject(p.id)}>
                              <span className="flex flex-col items-start">
                                <span className="font-medium text-foreground">{p.title}</span>
                                <span className="text-xs text-muted-foreground">Last Updated: {p.lastUpdated}</span>
                              </span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">No other projects available.</p>
                    )}
                  </div>
                  <Separator className="bg-border" />
                </div>
              )}
            </SheetContent>
          </Sheet>
        </header>
        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-background">
          <div className="flex flex-col space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[70%] ${message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {/* Typing dots animation when AI is thinking */}
            {messages.length > 0 && messages[messages.length - 1].text === "Thinking..." && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-lg p-3 max-w-[70%]">
                  <div className="flex items-center space-x-1">
                    <span className="animate-pulse w-2 h-2 bg-muted-foreground rounded-full"></span>
                    <span className="animate-pulse w-2 h-2 bg-muted-foreground rounded-full delay-75"></span>
                    <span className="animate-pulse w-2 h-2 bg-muted-foreground rounded-full delay-150"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        {showScrollToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-[100px] right-4 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background z-50"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
        <footer className="bg-card p-4 border-t border-border flex items-center w-full">
          <input
            type="text"
            placeholder="Type your message..."
            className="
    w-full px-4 py-2 rounded-xl border
    bg-white text-gray-900 placeholder-gray-500
    dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400
    border-gray-300 dark:border-gray-700
    focus:outline-none focus:ring-2 focus:ring-blue-500
  "
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            className="bg-primary text-primary-foreground p-2 rounded-r-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Send
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProjectChat;
