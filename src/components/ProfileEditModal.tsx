import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Import Avatar components
import { OptimizedImage } from '@/components/OptimizedImage';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any; // You might want to define a more specific type here
  onProfileUpdated: () => void;
  isPremium: boolean; // Add isPremium prop
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen, onClose, currentProfile, onProfileUpdated, isPremium
}) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState(''); // Remove bio state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setDisplayName(currentProfile.username || '');
      setBio(''); // Remove bio since it's not in new schema
      setSelectedAvatarUrl(currentProfile.avatar_url || null);
    }
  }, [currentProfile]);

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatarUrl(url);
    setAvatarFile(null); // Clear any uploaded file if an AI avatar is selected
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAvatarFile(event.target.files[0]);
      setSelectedAvatarUrl(null); // Clear selected AI avatar if a file is uploaded
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    let new_avatar_url = selectedAvatarUrl;

    try {
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const timestamp = new Date().getTime(); // Generate a timestamp
        const fileName = `${user.id}-${timestamp}.${fileExt}`; // Append timestamp to filename
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        new_avatar_url = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: displayName, avatar_url: new_avatar_url })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Profile updated successfully!');
      onProfileUpdated();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <Avatar className={`h-24 w-24 ring-2 cursor-pointer ${isPremium ? 'ring-amber-400' : 'ring-white/20'}`}>
              <OptimizedImage 
                src={selectedAvatarUrl || currentProfile?.avatar_url || "/placeholder.svg"}
                alt="User avatar"
                className="w-full h-full object-cover rounded-full"
              />
              <AvatarFallback className="bg-white/20 text-white font-semibold text-xl">
                {(displayName || currentProfile?.username || user?.email?.[0] || 'U').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="displayName" className="text-right">
              Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="avatarUpload" className="text-left">
              Upload Your Own Photo
            </Label>
            <Input
              id="avatarUpload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="col-span-3"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;
