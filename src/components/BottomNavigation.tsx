import { Home, ShoppingBag, Camera, Bot, Settings, ArrowUp, Users, History as HistoryIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show/hide navigation based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false); // Hide when scrolling down
      } else {
        setIsVisible(true); // Show when scrolling up
      }
      
      // Show/hide scroll to top button
      setShowScrollTop(currentScrollY > 300);
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Users, label: 'Community', path: '/community' },
    { icon: Camera, label: 'Scan', path: '/scan', isCenter: true },
    { icon: Bot, label: 'Repair Bot', path: '/chat' },
    { icon: HistoryIcon, label: 'History', path: '/history' },
  ];

  return (
    <>
      {/* Bottom Navigation */}
      <nav 
        className={`fixed bottom-4 left-4 right-4 transition-transform duration-300 z-50 ${
          isVisible ? 'transform translate-y-0' : 'transform translate-y-full'
        }`}
      >
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Pill-shaped Navigation Container */}
            <div className="bg-card border border-border rounded-full shadow-elevated px-6 py-3 mx-auto max-w-sm">
              <div className="flex items-center justify-between w-full">
                {/* Left Icons */}
                <div className="flex items-center gap-8">
                  {navItems.slice(0, 2).map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center gap-1 h-auto p-2 transition-all duration-200 hover:scale-105 w-12 ${
                          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Center Spacer for FAB */}
                <div className="w-16"></div>

                {/* Right Icons */}
                <div className="flex items-center gap-8">
                  {navItems.slice(3, 5).map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center gap-1 h-auto p-2 transition-all duration-200 hover:scale-105 w-12 ${
                          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Floating Action Button (Scan) - Overlays the pill */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4">
              <Button
                onClick={() => navigate('/scan')}
                className="h-16 w-16 rounded-full bg-gradient-primary shadow-elevated hover:shadow-elevated hover:scale-105 transition-all duration-200 border-4 border-background"
                size="icon"
              >
                <Camera className="h-7 w-7 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className={`fixed bottom-24 right-4 h-12 w-12 rounded-full bg-gradient-primary shadow-elevated hover:shadow-elevated hover:scale-105 transition-all duration-300 z-40 ${
            isVisible ? 'transform translate-y-0' : 'transform translate-y-16'
          }`}
          size="icon"
        >
          <ArrowUp className="h-5 w-5 text-white" />
        </Button>
      )}
    </>
  );
};

export default BottomNavigation;