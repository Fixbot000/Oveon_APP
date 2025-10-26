import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Upload, User, FileText, Wrench, Calendar, Sun, Moon, LogOut, HelpCircle, Star, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import BottomNavigation from "@/components/BottomNavigation";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  ispremium?: boolean;
  premiumuienabled?: boolean;
  premium_expiry?: string;
}

interface ProfileProps {
  isScrolled: boolean;
}

interface DiagnosticSession {
  id: string;
  device_category?: string;
  symptoms_text?: string;
  status: string;
  created_at: string;
  ai_analysis?: any;
}

const Profile = ({ isScrolled }: ProfileProps) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [diagnosticSessions, setDiagnosticSessions] = useState<DiagnosticSession[]>([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          await createProfile();
        } else {
          throw error;
        }
      } else {
        setProfile(data as Profile); // Cast data to Profile
        setUsername(data.username);
        if (data.font_family) {
          document.documentElement.style.fontFamily = data.font_family;
        }
      }

      // Fetch diagnostic sessions
      const { data: sessionsData } = await supabase
        .from('diagnostic_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setDiagnosticSessions(sessionsData || []);


    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const newProfile = {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        ispremium: false,
        premiumuienabled: false,
      };

      const { error } = await supabase
        .from('profiles')
        .insert([newProfile]);

      if (error) throw error;

      setProfile(newProfile);
      setUsername(newProfile.username);
      toast.success('Profile created successfully!');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, username });
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const timestamp = new Date().getTime(); // Generate a timestamp
    const fileName = `profile-${timestamp}.${fileExt}`; // Append timestamp to filename
    const filePath = `${user.id}/${fileName}`;

    setUploading(true);
    try {
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw error;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePremiumUi = async (checked: boolean) => {
    if (!user || !profile) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ premiumuienabled: checked })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, premiumuienabled: checked } : null);
      toast.success('Premium UI settings updated!');
    } catch (error: any) {
      console.error('Error updating premium UI settings:', error);
      toast.error('Failed to update premium UI settings');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="px-4 py-6">
          <Card className="text-center py-8">
            <CardContent>
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to view your activity history and manage your profile.
              </p>
              <Button onClick={() => window.location.href = '/auth'} className="bg-primary">
                Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 space-y-6">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className={`h-24 w-24 ring-2 cursor-pointer ${profile?.ispremium ? 'ring-amber-400' : 'ring-primary/20'}`}>
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {(profile?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button variant="outline" disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </Button>
              </div>
            </div>

            {/* Username Section */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
                {profile?.ispremium && <Badge className="bg-yellow-500 text-white">Premium</Badge>}
              </div>
            </div>

            {/* Email Display */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <Button 
              onClick={updateProfile} 
              disabled={updating || username.trim() === ''}
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Appearance</p>
                    <p className="text-sm text-muted-foreground">{theme === 'dark' ? 'Dark' : 'Light'} mode</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>

              {profile?.ispremium && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Premium UI [Coming Soon]</p>
                      <p className="text-sm text-muted-foreground">Golden finish for premium experience</p>
                    </div>
                  </div>
                  <Switch
                    checked={profile?.premiumuienabled}
                    onCheckedChange={handleTogglePremiumUi}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left"
                  onClick={() => navigate('/help')}
                >
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Help</span>
                </button>
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left"
                  onClick={() => navigate('/history')}
                >
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Scan History</span>
                </button>
                {profile?.ispremium && (
                  <button
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left"
                    onClick={() => navigate('/plans')}
                  >
                    <Star className="h-5 w-5 text-indigo-500" />
                    <div className="flex-1">
                      <span className="font-medium">My Plan</span>
                      <p className="text-sm text-muted-foreground">
                        Premium Active
                        {profile.premium_expiry && (
                          <span> until {new Date(profile.premium_expiry).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </button>
                )}
                {!profile?.ispremium && (
                  <button
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left"
                    onClick={() => navigate('/premium')}
                  >
                    <Star className="h-5 w-5 text-yellow-600" />
                    <div className="flex-1">
                      <span className="font-medium">Upgrade to Premium</span>
                      <p className="text-sm text-muted-foreground">Get unlimited scans and premium features</p>
                    </div>
                  </button>
                )}
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left"
                  onClick={() => navigate('/terms-and-policies')}
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Terms & Policies</span>
                </button>
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Profile;