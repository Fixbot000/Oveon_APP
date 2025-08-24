import { useState } from 'react';
import { Button } from '@/components/ui/button';
import onboarding1 from '@/assets/onboarding1.png';
import onboarding2 from '@/assets/onboarding2.png';
import onboarding3 from '@/assets/onboarding3.png';
import onboarding4 from '@/assets/onboarding4.png';

interface OnboardingScreen {
  image: string;
  title: string;
  description: string;
}

const screens: OnboardingScreen[] = [
  {
    image: onboarding1,
    title: "Welcome to DeviceRepair",
    description: "Do you have a device problem? Scan your problem to get instant solutions."
  },
  {
    image: onboarding2,
    title: "Scan the Device",
    description: "Use your camera to scan and identify your device for accurate diagnostics."
  },
  {
    image: onboarding3,
    title: "Select Symptoms",
    description: "Choose from a list of common symptoms to help diagnose your device issues."
  },
  {
    image: onboarding4,
    title: "Get Solutions",
    description: "Receive step-by-step repair instructions and professional recommendations."
  }
];

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentScreen, setCurrentScreen] = useState(0);

  const handleNext = () => {
    if (currentScreen === screens.length - 1) {
      onComplete();
    } else {
      setCurrentScreen(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentScreen > 0) {
      setCurrentScreen(prev => prev - 1);
    }
  };

  const handleDotClick = (index: number) => {
    setCurrentScreen(index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        {/* Main Content */}
        <div className="text-center mb-12">
          {/* Image */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-80 h-80 rounded-3xl overflow-hidden shadow-2xl bg-white/50 backdrop-blur-sm border border-white/20">
              <img 
                src={screens[currentScreen].image} 
                alt={screens[currentScreen].title}
                className="w-full h-full object-contain p-6"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-4 leading-tight">
            {screens[currentScreen].title}
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground leading-relaxed px-4">
            {screens[currentScreen].description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-3 mb-12">
          {screens.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentScreen
                  ? 'bg-primary scale-125 shadow-lg'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {/* Previous Button */}
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentScreen === 0}
            className={`text-muted-foreground hover:text-foreground transition-all duration-200 ${
              currentScreen === 0 ? 'invisible' : 'visible'
            }`}
          >
            Previous
          </Button>

          {/* Next/Get Started Button */}
          <Button
            onClick={handleNext}
            className="px-8 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            {currentScreen === screens.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;