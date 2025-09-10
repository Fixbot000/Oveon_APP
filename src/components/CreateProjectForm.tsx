import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';

interface CreateProjectFormProps {
  onCancel: () => void;
  onCreate: (projectName: string, description: string, files: File[]) => void;
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onCancel, onCreate }) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (projectName.trim()) {
      onCreate(projectName, description, files);
    } else {
      alert('Project Name is required!');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="projectName">Project Name</Label>
        <Input
          id="projectName"
          placeholder="Enter project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Project description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="files" className="flex items-center space-x-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Upload Files (PDF, DOC, Images)</span>
        </Label>
        <Input
          id="files"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        />
        {files.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {files.map((file, index) => (
              <span key={index} className="block">{file.name}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create
        </Button>
      </div>
    </form>
  );
};

export default CreateProjectForm;
