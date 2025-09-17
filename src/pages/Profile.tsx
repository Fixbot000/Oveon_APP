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
import MobileHeader from "@/components/MobileHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  ispremium?: boolean;
  premiumuienabled?: boolean;
  premium_expiry?: string;
}

interface DiagnosticSession {
  id: string;
  device_category?: string;
  symptoms_text?: string;
  status: string;
  created_at: string;
  ai_analysis?: any;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [diagnosticSessions, setDiagnosticSessions] = useState<DiagnosticSession[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialDark = stored ? stored === 'dark' : false;
      setIsDarkMode(initialDark);
      document.documentElement.classList.toggle('dark', initialDark);
    } catch (e) {
      // noop
    }
  }, []);

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

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    try {
      document.documentElement.classList.toggle('dark', checked);
      localStorage.setItem('theme', checked ? 'dark' : 'light');
    } catch (e) {
      // noop
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

  const handleUpgradeNow = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      // For now, simulate billing redirect (placeholder)
      toast.success('Redirecting to billing...');
      
      // On success, set premium status
      const premiumExpiry = new Date();
      premiumExpiry.setDate(premiumExpiry.getDate() + 28); // 28 days from now
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ispremium: true, 
          premium_expiry: premiumExpiry.toISOString() 
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { 
        ...prev, 
        ispremium: true, 
        premium_expiry: premiumExpiry.toISOString() 
      } : null);
      
      toast.success('Welcome to Premium! Your subscription is active for 28 days.');
      
      // Reload to update auth context
      window.location.reload();
    } catch (error: any) {
      console.error('Error upgrading to premium:', error);
      toast.error('Failed to upgrade to premium');
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectPlan = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      // Reset/extend premium by 28 days
      const premiumExpiry = new Date();
      premiumExpiry.setDate(premiumExpiry.getDate() + 28);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ispremium: true, 
          premium_expiry: premiumExpiry.toISOString() 
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { 
        ...prev, 
        ispremium: true, 
        premium_expiry: premiumExpiry.toISOString() 
      } : null);
      
      toast.success('Your premium subscription has been extended for 28 days!');
    } catch (error: any) {
      console.error('Error extending premium:', error);
      toast.error('Failed to extend premium subscription');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!user || !profile) return;

    // Confirm cancellation
    const confirmed = window.confirm(
      'Are you sure you want to cancel your premium plan? You will keep premium features until your current subscription expires.'
    );
    
    if (!confirmed) return;

    setUpdating(true);
    try {
      // Note: We keep ispremium = true until premium_expiry is reached
      // The auth context will handle the expiry check
      toast.success('Your premium plan has been cancelled. You will keep premium features until your subscription expires.');
    } catch (error: any) {
      console.error('Error cancelling plan:', error);
      toast.error('Failed to cancel premium plan');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader onRefresh={fetchProfile} isPremium={profile?.ispremium || false} />
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
        <MobileHeader onRefresh={() => window.location.reload()} isPremium={profile?.ispremium || false} />
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
      <MobileHeader onRefresh={fetchProfile} isPremium={profile?.ispremium || false} />
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
                <AvatarImage src={`${profile?.avatar_url}?v=${new Date().getTime()}`} />
                <AvatarFallback className="text-2xl">
                  {username.charAt(0).toUpperCase()}
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
                  {isDarkMode ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Appearance</p>
                    <p className="text-sm text-muted-foreground">{isDarkMode ? 'Dark' : 'Light'} mode</p>
                  </div>
                </div>
                <Switch checked={isDarkMode} onCheckedChange={handleToggleTheme} />
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-md px-3 py-2 bg-muted/50">
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
                    </div>
                    <div className="flex gap-2 px-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectPlan}
                        disabled={updating}
                        className="flex-1"
                      >
                        Select Plan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelPlan}
                        disabled={updating}
                        className="flex-1 text-destructive hover:text-destructive"
                      >
                        Cancel Plan
                      </Button>
                    </div>
                  </div>
                )}
                {!profile?.ispremium && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted text-left text-yellow-600">
                      <Star className="h-5 w-5" />
                      <div className="flex-1">
                        <span className="font-medium">Upgrade to Premium</span>
                        <p className="text-sm text-muted-foreground">Get unlimited scans and premium features</p>
                      </div>
                    </div>
                    <div className="px-3">
                      <Button
                        onClick={handleUpgradeNow}
                        disabled={updating}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        {updating ? 'Processing...' : 'Upgrade Now'}
                      </Button>
                    </div>
                  </div>
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