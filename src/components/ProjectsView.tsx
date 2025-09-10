import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import CreateProjectForm from './CreateProjectForm';

interface Project {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
}

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (projectName: string, description: string, files: File[]) => void; // Add this prop
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onSelectProject, onCreateProject }) => {
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const handleCreateProject = (projectName: string, description: string, files: File[]) => {
    onCreateProject(projectName, description, files);
    setShowCreateProjectModal(false);
  };

  return (
    <div className="p-4">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreateProjectModal(true)} className="bg-primary text-primary-foreground">
          <PlusCircle className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <h2 className="text-xl font-bold mb-2 text-foreground">No projects yet.</h2>
          <p className="text-muted-foreground mb-4">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <Card 
              key={project.id}
              className="bg-card shadow-card border-border hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => onSelectProject(project.id)}
            >
              <CardHeader>
                <CardTitle className="text-foreground">{project.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{project.description}</p>
                <p className="text-xs text-muted-foreground">Last Updated: {project.lastUpdated}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateProjectModal} onOpenChange={setShowCreateProjectModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Fill in the details for your new project.
            </DialogDescription>
          </DialogHeader>
          <CreateProjectForm
            onCancel={() => setShowCreateProjectModal(false)}
            onCreate={handleCreateProject}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsView;
