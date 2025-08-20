import { Home, ShoppingBag, Camera, Bot, Settings, ArrowUp } from 'lucide-react';
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
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: Camera, label: 'Scan', path: '/scan', isCenter: true },
    { icon: Bot, label: 'Repair Bot', path: '/chat' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      {/* Bottom Navigation */}
      <nav 
        className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border transition-transform duration-300 z-50 ${
          isVisible ? 'transform translate-y-0' : 'transform translate-y-full'
        }`}
      >
        <div className="px-4 py-2">
          <div className="flex items-end justify-center max-w-md mx-auto relative">
            {/* Navigation Items Container */}
            <div className="flex items-center justify-between w-full px-4">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const isCenter = index === 2; // Scan button is at index 2
                
                if (isCenter) {
                  return (
                    <div key={item.path} className="flex flex-col items-center relative -top-4">
                      <Button
                        onClick={() => navigate(item.path)}
                        className="h-16 w-16 rounded-full bg-gradient-primary shadow-elevated hover:shadow-elevated hover:scale-105 transition-all duration-200 mb-2"
                        size="icon"
                      >
                        <Camera className="h-7 w-7 text-white" />
                      </Button>
                      <span className="text-xs font-medium text-muted-foreground absolute -bottom-1">
                        Scan
                      </span>
                    </div>
                  );
                }
                
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center gap-1 h-auto p-3 transition-all duration-200 hover:scale-105 w-16 ${
                      isActive ? 'text-primary bg-primary/10 rounded-lg' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </Button>
                );
              })}
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