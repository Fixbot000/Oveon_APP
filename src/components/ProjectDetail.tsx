import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, UserPlus, MessageSquare, MoreVertical } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
interface Project {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
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
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onBack }) => {
  const [files, setFiles] = useState<ProjectFile[]>([
    { id: 'f1', name: 'Schematic_v1.pdf', type: 'pdf', url: '#' },
    { id: 'f2', name: 'Device_Photo_1.jpg', type: 'image', url: '#' },
  ]);
  const [members, setMembers] = useState<ProjectMember[]>([
    { id: 'm1', name: 'Alice Smith', role: 'Owner' },
    { id: 'm2', name: 'Bob Johnson', role: 'Collaborator' },
  ]);
  const [progress, setProgress] = useState(60); // Dummy progress

  const handleUploadFile = () => {
    console.log('Upload file action');
    // Implement file upload logic here
  };

  const handleAddMember = () => {
    console.log('Add member action');
    // Implement add member logic here
  };

  const handleStartChat = () => {
    console.log('Start chat action');
    // Implement chat logic here (Part 2)
  };

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
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle className="text-foreground">{project.title}</SheetTitle>
            </SheetHeader>
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
                  {members.map(member => (
                    <li key={member.id} className="text-sm text-muted-foreground">{member.name} ({member.role})</li>
                  ))}
                </ul>
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
                <h4 className="font-semibold text-foreground">Other Projects</h4>
                <p className="text-sm text-muted-foreground">Project A</p>
                <p className="text-sm text-muted-foreground">Project B</p>
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
          {files.length === 0 ? (
            <p className="text-muted-foreground text-sm">No files uploaded yet.</p>
          ) : (
            <ul className="space-y-1">
              {files.map(file => (
                <li key={file.id} className="flex items-center text-sm text-muted-foreground">
                  <span className="mr-2">📄</span> {file.name}
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
        <Button onClick={handleAddMember} className="flex flex-col items-center justify-center p-4 h-auto bg-secondary text-secondary-foreground">
          <UserPlus className="h-6 w-6 mb-1" />
          <span className="text-xs">Add Member</span>
        </Button>
        <Button onClick={handleStartChat} className="flex flex-col items-center justify-center p-4 h-auto bg-primary text-primary-foreground">
          <MessageSquare className="h-6 w-6 mb-1" />
          <span className="text-xs">Start Chat</span>
        </Button>
      </div>

      {/* Progress Tracker */}
      <Card className="bg-card shadow-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Progress value={progress} className="flex-1" />
            <span className="text-sm font-medium text-foreground">{progress}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Keep up the good work!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetail;
