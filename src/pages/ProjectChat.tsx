import { useParams } from "react-router-dom";
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/hooks/useAuth';

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
        setMessages([ // Default initial message
          { id: 1, sender: 'ai', text: "Hello! How can I help you with this project today?" },
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

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;

    const newUserMessage = { id: Date.now(), sender: 'user' as const, text: inputMessage };
    const updatedMessagesAfterUser = [...messages, newUserMessage];
    setMessages(updatedMessagesAfterUser);
    setInputMessage('');

    // Update project in localStorage immediately after user sends message
    if (project) {
      const updatedProjects = allProjects.map(p =>
        p.id === projectId ? { ...p, chatHistory: updatedMessagesAfterUser } : p
      );
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      setAllProjects(updatedProjects); // Update allProjects state as well
    }

    // Simulate AI response
    setTimeout(() => {
      const thinkingMessage = { id: Date.now() + 1, sender: 'ai' as const, text: "Thinking..." };
      const updatedMessagesWithThinking = [...updatedMessagesAfterUser, thinkingMessage];
      setMessages(updatedMessagesWithThinking);
      scrollToBottom();

      // Update project in localStorage after AI thinking message
      if (project) {
        const updatedProjectsWithThinking = allProjects.map(p =>
          p.id === projectId ? { ...p, chatHistory: updatedMessagesWithThinking } : p
        );
        localStorage.setItem('projects', JSON.stringify(updatedProjectsWithThinking));
        setAllProjects(updatedProjectsWithThinking);
      }

      setTimeout(() => {
        const aiResponseMessage = { id: Date.now() + 2, sender: 'ai' as const, text: "I can help you with that. What kind of components are you looking for?" };
        const finalMessages = updatedMessagesAfterUser.map((msg) =>
          msg.id === thinkingMessage.id ? aiResponseMessage : msg
        );
        if (!finalMessages.some(msg => msg.id === aiResponseMessage.id)) {
          finalMessages.push(aiResponseMessage);
        }

        setMessages(finalMessages);
        scrollToBottom();

        // Update project in localStorage after AI final response
        if (project) {
          const finalUpdatedProjects = allProjects.map(p =>
            p.id === projectId ? { ...p, chatHistory: finalMessages } : p
          );
          localStorage.setItem('projects', JSON.stringify(finalUpdatedProjects));
          setAllProjects(finalUpdatedProjects);
        }
      }, 1500);
    }, 500);
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
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle className="text-foreground">{project ? project.title : "Project Info"}</SheetTitle>
              </SheetHeader>
              {project && (
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Project Info</h4>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    <p className="text-xs text-muted-foreground">Last Updated: {project.lastUpdated}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-foreground">Members</h4>
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
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-foreground">Uploaded Files:</h4>
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
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-foreground">To-Do Checklist</h4>
                    <p className="text-sm text-muted-foreground">Task 1: Complete (✅)</p>
                    <p className="text-sm text-muted-foreground">Task 2: In Progress (⏳)</p>
                    {/* Placeholder for dynamic to-do list */}
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-foreground">Switch to Other Project</h4>
                    {allProjects.length > 0 ? (
                      <ul className="space-y-2">
                        {allProjects.filter(p => p.id !== project.id).map(p => (
                          <li key={p.id}>
                            <Button variant="outline" className="w-full justify-start h-auto p-2 bg-secondary/50 hover:bg-secondary border-transparent hover:border-border transition-all duration-200"
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
                      <p className="text-sm text-muted-foreground">No other projects available.</p>
                    )}
                  </div>
                  <Separator />
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
      <BottomNavigation />
    </div>
  );
};

export default ProjectChat;
