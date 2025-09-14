import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface CreateProjectFormProps {
  onCancel: () => void;
  onCreate: (projectName: string, description: string, files: File[]) => void;
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({
  onCancel, onCreate
}) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(projectName, description, files);
    setProjectName('');
    setDescription('');
    setFiles([]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4 bg-card text-foreground">
      <div className="grid gap-2">
        <Label htmlFor="projectName">Project Name</Label>
        <Input
          id="projectName"
          placeholder="My awesome project"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
          className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="A brief description of your project..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="files">Upload Files</Label>
        <Input
          id="files"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileChange}
          className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        />
        <div className="mt-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md mb-1">
              <span className="text-sm text-foreground">{file.name}</span>
              <button type="button" onClick={() => handleRemoveFile(index)} className="text-destructive hover:text-destructive/90">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Add Members (optional) - Placeholder for now */}
      <div className="grid gap-2">
        <Label htmlFor="addMembers">Add Members (optional)</Label>
        <Input
          id="addMembers"
          placeholder="Enter email or username"
          className="bg-background border border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="border-border bg-background text-foreground hover:bg-muted">
        Close</Button>
        <Button type="submit" className="bg-primary text-primary-foreground">Save Project</Button>
      </div>
    </form>
  );
};

export default CreateProjectForm;
