import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, UserPlus, MessageSquare, MoreVertical } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
interface Project {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  files?: ProjectFile[];
  members?: ProjectMember[];
}
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

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

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onBack, onUpdateProject }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles: ProjectFile[] = Array.from(selectedFiles).map((file) => ({
        id: `f${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file), // Create a temporary URL for display if needed
      }));
      const updatedFiles = project.files ? [...project.files, ...newFiles] : newFiles;
      onUpdateProject({ ...project, files: updatedFiles });
    }
  };

  const handleAddMember = () => {
    const newMember: ProjectMember = {
      id: `m${Date.now()}`,
      name: `New Member ${project.members ? project.members.length + 1 : 1}`,
      role: 'Collaborator',
    };
    const updatedMembers = project.members ? [...project.members, newMember] : [newMember];
    onUpdateProject({ ...project, members: updatedMembers });
  };

  const handleStartChat = () => {
    navigate(`/project/${project.id}/chat`);
  };

  const navigate = useNavigate();

  return (
    <div className="p-4">
      {/* Header with Back Button and Drawer Trigger */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={onBack} className="text-primary">
          &lt; Back to Projects
        </Button>
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
                  {project.members?.map(member => (
                    <li key={member.id} className="text-sm text-blue-100">{member.name} ({member.role})</li>
                  ))}
                </ul>
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
                  Other Projects
                </h4>
                <p className="text-sm text-blue-100">Project A</p>
                <p className="text-sm text-blue-100">Project B</p>
                {/* Placeholder for dynamic other projects list */}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Project Info Card */}
      <Card className="bg-card shadow-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">{project.title}</CardTitle>
          <CardDescription className="text-muted-foreground">{project.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">Last Updated: {project.lastUpdated}</p>
          <h4 className="font-semibold text-foreground mt-4 mb-2">Uploaded Files:</h4>
          {project.files?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No files</p>
          ) : (
            <ul className="space-y-1">
              {project.files?.map(file => (
                <li key={file.id} className="text-sm text-muted-foreground">
                   {file.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Button onClick={handleUploadFile} className="flex flex-col items-center justify-center p-4 h-auto bg-secondary text-secondary-foreground">
          <Upload className="h-6 w-6 mb-1" />
          <span className="text-xs">Upload File</span>
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={handleAddMember} className="flex flex-col items-center justify-center p-4 h-auto bg-secondary text-secondary-foreground">
          <UserPlus className="h-6 w-6 mb-1" />
          <span className="text-xs">Add Member</span>
        </Button>
        <Button onClick={handleStartChat} className="flex flex-col items-center justify-center p-4 h-auto bg-primary text-primary-foreground">
          <MessageSquare className="h-6 w-6 mb-1" />
          <span className="text-xs">Start Chat</span>
        </Button>
      </div>
    </div>
  );
};

export default ProjectDetail;
