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
      <div className="flex items-center justify-between max-w-sm mx-auto relative">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.isCenter) {
            return (
              <div key={item.path} className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1">
                <Button
                  onClick={() => navigate(item.path)}
                  className="h-16 w-16 rounded-full bg-gradient-primary shadow-elevated hover:shadow-elevated hover:scale-105 transition-all duration-200"
                  size="icon"
                >
                  <Icon className="h-7 w-7 text-white" />
                </Button>
              </div>
            );
          }

          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1.5 h-auto p-3 min-w-0 transition-all duration-200 hover:scale-105 ${
                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              } ${index < 2 ? 'mr-6' : 'ml-6'}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;