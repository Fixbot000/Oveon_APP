import { Bell, RefreshCw, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { useRefresh } from '@/hooks/useRefresh'; // Import useRefresh hook

interface MobileHeaderProps {
  // showSearch?: boolean;
  onRefresh?: () => Promise<void> | void; // Make onRefresh optional
  isPremium?: boolean; // Add isPremium prop
  showBackButton?: boolean; // New prop for showing back button
  backButtonTarget?: string; // New prop for back button navigation target
  alignLeft?: boolean; // New prop for aligning content to the left
  title?: string; // New prop for custom title
  avatarUrl?: string; // New prop for custom avatar URL
  isTargetUserPremium?: boolean; // New prop for target user's premium status
  isScrolled?: boolean; // Add isScrolled prop
}

const MobileHeader = ({ onRefresh, isPremium, showBackButton, backButtonTarget, alignLeft, title, avatarUrl, isTargetUserPremium }: MobileHeaderProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasShrunk } = useScrollPosition(20); // Use the new hook
  const { triggerRefresh } = useRefresh(); // Use the useRefresh hook

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
        .select('username, avatar_url, ispremium')
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
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh(); // Use the passed onRefresh prop
      }
      triggerRefresh(); // Trigger global refresh
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className={`sticky top-0 z-50 px-4 rounded-b-3xl shadow-card flex flex-col justify-center transition-all duration-300 ease-in-out
    ${(hasShrunk) ? 'min-h-[70px] bg-gradient-header' : 'min-h-[120px] bg-gradient-header'}`}>
      <div className="flex items-center justify-between relative w-full">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backButtonTarget || '/profile')}
            className="text-white hover:bg-white/20 transition-all duration-200 my-auto"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        <div className={`flex items-center gap-3 transition-all duration-300 ease-in-out ${hasShrunk ? 'scale-90' : 'scale-100'} ${alignLeft ? 'mr-auto' : showBackButton ? 'pl-10' : ''}`}>
          
          <Avatar 
            className={`ring-2 cursor-pointer transition-all duration-300 ease-in-out ${hasShrunk ? 'h-9 w-9' : 'h-12 w-12'} ${avatarUrl ? (isTargetUserPremium ? 'ring-amber-400' : 'ring-white/20') : (profile?.ispremium ? 'ring-amber-400' : 'ring-white/20')}`}
            // onClick={() => { if (!avatarUrl) setIsEditModalOpen(true); }} // Open modal on avatar click, only if it's the current user's profile
          >
            <OptimizedImage 
              src={avatarUrl || profile?.avatar_url || "/placeholder.svg"}
              alt="User avatar"
              className="w-full h-full object-cover rounded-full"
            />
            <AvatarFallback className="bg-white/20 text-white font-semibold text-lg">
              {avatarUrl ? (title?.[0]?.toUpperCase() || 'U') : (user ? getUserDisplayName()[0]?.toUpperCase() : 'U')}
            </AvatarFallback>
          </Avatar>
          <div className={`transition-all duration-300 ease-in-out ${hasShrunk ? 'opacity-100 h-auto overflow-visible' : 'opacity-100 h-auto overflow-visible'}`}>
            <h1 className={`text-white font-semibold transition-all duration-300 ease-in-out ${hasShrunk ? 'text-base' : 'text-lg'}`}>
              {title || `Hi, ${user ? getUserDisplayName() : 'User'}`}
            </h1>
            {!title && <p className={`text-white/80 text-xs transition-all duration-300 ease-in-out ${hasShrunk ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto overflow-visible'}`}>Ready to fix something?</p>}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-white hover:bg-white/20 transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {!title && <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 transition-all duration-200">
            <Bell className="h-5 w-5" />
          </Button>}
        </div>
      </div>
      
      {/* {showSearch && (
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-3 w-3" />
          <Input
            placeholder="Search repairs, tips..."
            className="bg-white/15 backdrop-blur-sm border-white/30 text-white placeholder:text-white/70 pl-9 pr-10 h-10 rounded-xl focus:bg-white/20 focus:border-white/40 transition-all duration-200"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 h-7 w-7 rounded-full transition-all duration-200"
          >
            <Bell className="h-3 w-3" />
          </Button>
        </div>
      )} */}

    </header>
  );
};

export default MobileHeader;