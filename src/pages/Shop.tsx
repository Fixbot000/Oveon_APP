import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BottomNavigation from '@/components/BottomNavigation';
import { Cpu, Zap, Battery, Wrench, Calculator, Cable } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import React, { useState, useEffect, useRef } from 'react';
import { useRefresh } from '@/hooks/useRefresh'; // Import useRefresh hook

const Shop = () => {
  const categories = [
    { icon: Cpu, name: 'ICs' },
    { icon: Zap, name: 'Resistors' },
    { icon: Battery, name: 'Capacitors' },
    { icon: Wrench, name: 'Tools' },
    { icon: Calculator, name: 'Multimeters' },
    { icon: Cable, name: 'Wires' },
  ];

  const featuredProducts = [
    {
      id: 1,
      name: 'Digital Multimeter',
      price: '$29.99',
      image: '/placeholder.svg'
    },
    {
      id: 2,
      name: 'Soldering Kit',
      price: '$15.49',
      image: '/placeholder.svg'
    },
    {
      id: 3,
      name: 'Raspberry Pi',
      price: '$35.00',
      image: '/placeholder.svg'
    },
  ];

  const { isPremium } = useAuth(); // Destructure isPremium from useAuth
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const SCROLL_THRESHOLD_DOWN = 100; // Define a threshold for scrolling down
  const SCROLL_THRESHOLD_UP = 50;   // Define a threshold for scrolling up

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > SCROLL_THRESHOLD_DOWN) {
        // Scrolling down past the threshold
        setHeaderScrolled(true);
      } else if (currentScrollY < lastScrollY.current && currentScrollY < SCROLL_THRESHOLD_UP) {
        // Scrolling up past the threshold, or near the top
        setHeaderScrolled(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Consume refresh context and log when triggered
  const { refreshTrigger } = useRefresh();
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Shop page detected global refresh.');
      // Add any specific refresh logic for Shop page here if needed in the future
    }
  }, [refreshTrigger]);

  return (
    <div className="min-h-screen bg-background pb-20">
      
      <main className="px-4 py-6 space-y-6">
        {/* Categories */}
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.name} className="flex flex-col items-center">
                    <div className="p-3 bg-gradient-primary rounded-full mb-2">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-center">{category.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Featured Products */}
        <div>
          <h2 className="text-xl font-bold mb-4">Featured Products</h2>
          <div className="grid gap-4">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="bg-card shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-2xl font-bold text-primary mt-1">{product.price}</p>
                    </div>
                    <Button className="bg-gradient-primary text-white">
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Community Posts */}
        <div>
          <h2 className="text-xl font-bold mb-4">Community Posts</h2>
          <div className="space-y-4">
            <Card className="bg-card shadow-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Recent community discussions and repair tips...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Shop;