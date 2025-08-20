import { Home, ShoppingBag, Camera, Bot, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: Camera, label: 'Scan', path: '/scan', isCenter: true },
    { icon: Bot, label: 'Repair Bot', path: '/chat' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-6 py-3 z-50">
      <div className="flex items-center justify-center max-w-lg mx-auto">
        <div className="flex items-center justify-around w-full">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isCenter = index === 2; // Scan button is at index 2
            
            if (isCenter) {
              return (
                <div key={item.path} className="flex flex-col items-center">
                  <Button
                    onClick={() => navigate(item.path)}
                    className="h-14 w-14 rounded-full bg-gradient-primary shadow-elevated hover:shadow-elevated hover:scale-105 transition-all duration-200 mb-1"
                    size="icon"
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </Button>
                  <span className="text-xs font-medium text-muted-foreground">Scan</span>
                </div>
              );
            }
            
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 h-auto p-2 transition-all duration-200 hover:scale-105 min-w-[60px] ${
                  isActive ? 'text-primary bg-primary/10 rounded-lg' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;