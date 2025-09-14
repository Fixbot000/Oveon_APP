import { useParams } from "react-router-dom";
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

const ProjectChat = () => {
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
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <MobileHeader onRefresh={() => window.location.reload()} isPremium={isPremium} showBackButton={false} backButtonTarget="/chat"/>
      <div className="flex flex-col flex-1">
        <header className="bg-gray-100 p-4 border-b flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-200"
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
            <SheetContent side="left" className="w-72 bg-blue-900 text-white border-r-0 rounded-r-xl shadow-lg">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-white text-2xl font-bold">Project Details</SheetTitle>
              </SheetHeader>
              {project && (
                <div className="mt-4 space-y-6">
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>
                      Project Info
                    </h4>
                    <p className="text-sm text-blue-100">{project.description}</p>
                    <p className="text-xs text-blue-200">Last Updated: {project.lastUpdated}</p>
                  </div>
                  <Separator className="bg-blue-700" />
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                      Members
                    </h4>
                    <ul>
                      {project.members && project.members.length > 0 ? (
                        project.members.map(member => (
                          <li key={member.id} className="text-sm text-blue-100">{member.name} ({member.role})</li>
                        ))
                      ) : (
                        <li className="text-sm text-blue-100">No members added.</li>
                      )}
                    </ul>
                  </div>
                  <Separator className="bg-blue-700" />
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></span>
                      Uploaded Files:
                    </h4>
                    {project.files && project.files.length > 0 ? (
                      <ul className="space-y-1">
                        {project.files.map(file => (
                          <li key={file.id} className="text-sm text-blue-100">
                             {file.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-blue-100 text-sm">No files uploaded yet.</p>
                    )}
                  </div>
                  <Separator className="bg-blue-700" />
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-checks"><path d="m3 16 2 2 4-4"/><path d="m3 12 2 2 4-4"/><path d="m3 8 2 2 4-4"/><path d="M11 4h9"/><path d="M11 8h9"/><path d="M11 12h9"/><path d="M11 16h9"/></svg></span>
                      To-Do Checklist
                    </h4>
                    <p className="text-sm text-blue-100">Task 1: Complete (✅)</p>
                    <p className="text-sm text-blue-100">Task 2: In Progress (⏳)</p>
                    {/* Placeholder for dynamic to-do list */}
                  </div>
                  <Separator className="bg-blue-700" />
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                      <span className="h-5 w-5 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-git-2"><path d="M3 3a1 1 0 0 1 1-1h7.414a1 1 0 0 1 .707.293L15 5h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 13v-1"/><path d="M14 17v-1"/><circle cx="14" cy="15" r="2"/><path d="M12 15h-2"/></svg></span>
                      Switch to Other Project
                    </h4>
                    {allProjects.length > 0 ? (
                      <ul className="space-y-2 mt-2">
                        {allProjects.filter(p => p.id !== project.id).map(p => (
                          <li key={p.id}>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start h-auto p-3 text-white hover:bg-blue-800 focus:bg-blue-700 transition-all duration-200 rounded-lg"
                              onClick={() => handleSelectProject(p.id)}>
                              <span className="flex flex-col items-start">
                                <span className="font-medium text-white">{p.title}</span>
                                <span className="text-xs text-blue-200">Last Updated: {p.lastUpdated}</span>
                              </span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-blue-100 text-sm">No other projects available.</p>
                    )}
                  </div>
                  <Separator className="bg-blue-700" />
                </div>
              )}
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="flex flex-col space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[70%] ${message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                    }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {/* Typing dots animation when AI is thinking */}
            {messages.length > 0 && messages[messages.length - 1].text === "Thinking..." && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 rounded-lg p-3 max-w-[70%]">
                  <div className="flex items-center space-x-1">
                    <span className="animate-pulse w-2 h-2 bg-gray-500 rounded-full"></span>
                    <span className="animate-pulse w-2 h-2 bg-gray-500 rounded-full delay-75"></span>
                    <span className="animate-pulse w-2 h-2 bg-gray-500 rounded-full delay-150"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        <footer className="bg-gray-100 p-4 border-t flex items-center">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProjectChat;
