import { Bell, Search, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProfileEditModal from '@/components/ProfileEditModal'; // Import the new modal

interface MobileHeaderProps {
  showSearch?: boolean;
  onRefresh?: () => Promise<void> | void;
}

const MobileHeader = ({ showSearch = true, onRefresh }: MobileHeaderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for modal visibility

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const getUserDisplayName = () => {
    if (profile?.username) return profile.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success('Refreshed successfully!');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="bg-gradient-header p-6 pb-8 rounded-b-3xl shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar 
            className="h-14 w-14 ring-2 ring-white/20 cursor-pointer"
            onClick={() => setIsEditModalOpen(true)} // Make avatar clickable
          >
            <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
            <AvatarFallback className="bg-white/20 text-white font-semibold text-lg">
              {user ? getUserDisplayName()[0]?.toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-white text-xl font-semibold">
              Hi, {user ? getUserDisplayName() : 'User'}
            </h1>
            <p className="text-white/80 text-sm">Ready to fix something?</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-white hover:bg-white/20 transition-all duration-200"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          
          {showSearch ? (
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 transition-all duration-200">
              <Search className="h-6 w-6" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 transition-all duration-200">
              <Bell className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
      
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
          <Input
            placeholder="Search repairs, tips..."
            className="bg-white/15 backdrop-blur-sm border-white/30 text-white placeholder:text-white/70 pl-12 pr-12 h-12 rounded-2xl focus:bg-white/20 focus:border-white/40 transition-all duration-200"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 h-8 w-8 rounded-full transition-all duration-200"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ProfileEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onProfileUpdated={fetchProfile} // Refresh profile after update
      />
    </header>
  );
};

export default MobileHeader;