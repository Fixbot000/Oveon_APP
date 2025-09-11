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
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="projectName">Project Name</Label>
        <Input
          id="projectName"
          placeholder="My awesome project"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
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
        />
        <div className="mt-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md mb-1">
              <span className="text-sm text-gray-700">{file.name}</span>
              <button type="button" onClick={() => handleRemoveFile(index)} className="text-red-500 hover:text-red-700">
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
        />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Close</Button>
        <Button type="submit" className="bg-primary text-primary-foreground">Save Project</Button>
      </div>
    </form>
  );
};

export default CreateProjectForm;
