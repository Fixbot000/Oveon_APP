import { Bell, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface MobileHeaderProps {
  showSearch?: boolean;
}

const MobileHeader = ({ showSearch = true }: MobileHeaderProps) => {
  const { user } = useAuth();

  return (
    <header className="bg-gradient-header p-4 pb-6 rounded-b-3xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-white/20 text-white">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-white text-xl font-semibold">
              Hi, {user?.email?.split('@')[0] || 'User'}
            </h1>
          </div>
        </div>
        
        {showSearch ? (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Search className="h-6 w-6" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Bell className="h-6 w-6" />
          </Button>
        )}
      </div>
      
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pl-12 pr-12 h-12 rounded-full"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/10 h-8 w-8"
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      )}
    </header>
  );
};

export default MobileHeader;