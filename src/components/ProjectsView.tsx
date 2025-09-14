import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import BottomSheetModal from '@/components/BottomSheetModal';
import CreateProjectForm from './CreateProjectForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  onDeleteProject: (projectId: string) => void; // Add this prop
  onModalToggle: (isOpen: boolean) => void;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onSelectProject, onCreateProject, onDeleteProject, onModalToggle }) => {
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const handleCreateProject = (projectName: string, description: string, files: File[]) => {
    onCreateProject(projectName, description, files);
    setShowCreateProjectModal(false);
  };

  useEffect(() => {
    onModalToggle(showCreateProjectModal);
  }, [showCreateProjectModal, onModalToggle]);

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
              className="bg-card shadow-card border-border hover:shadow-lg transition-shadow duration-200 cursor-pointer relative"
              
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-foreground" onClick={() => onSelectProject(project.id)}>{project.title}</CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-red-500"
                      onClick={(e) => e.stopPropagation()} // Prevent card click when deleting
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card text-foreground border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        This action cannot be undone. This will permanently delete your project.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border bg-background text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteProject(project.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent onClick={() => onSelectProject(project.id)}>
                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{project.description}</p>
                <p className="text-xs text-muted-foreground">Last Updated: {project.lastUpdated}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BottomSheetModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        title="Create New Project"
      >
        <CreateProjectForm
          onCancel={() => setShowCreateProjectModal(false)}
          onCreate={handleCreateProject}
        />
      </BottomSheetModal>
    </div>
  );
};

export default ProjectsView;
