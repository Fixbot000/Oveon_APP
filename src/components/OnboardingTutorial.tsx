import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import onboarding1 from '@/assets/onboarding1.png';
import onboarding2 from '@/assets/onboarding2.png';
import onboarding3 from '@/assets/onboarding3.png';
import onboarding4 from '@/assets/onboarding4.png';
import { Bot, Camera, History as HistoryIcon, Settings, User, Users, Wand2, Search } from 'lucide-react';

const STORAGE_KEY = 'hasSeenTutorial';

const PageContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-4">
    {children}
  </div>
);

export const OnboardingTutorial = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  const totalSteps = 4;

  const canGoBack = step > 0;
  const isLastStep = step === totalSteps - 1;

  // Show tutorial only for new unauthenticated users
  useEffect(() => {
    if (loading) return;
    const hasSeen = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!user) {
      setIsOpen(!hasSeen);
    } else {
      setIsOpen(false);
    }
  }, [user, loading]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    navigate('/auth');
  };

  const next = () => {
    if (isLastStep) {
      finish();
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const pages = useMemo(() => [
    (
      <PageContainer>
        <img src={onboarding1} alt="Onboarding Image 1" className="w-full h-auto object-contain" />
        <p className="text-base text-gray-700 text-center">
          Do you have a device problem?
          <br />
          Scan your problem to get instant solutions.
        </p>
      </PageContainer>
    ),
    (
      <PageContainer>
        <img src={onboarding2} alt="Onboarding Image 2" className="w-full h-auto object-contain" />
        <p className="text-base text-gray-700 text-center">
          Scan the device
        </p>
      </PageContainer>
    ),
    (
      <PageContainer>
        <img src={onboarding3} alt="Onboarding Image 3" className="w-full h-auto object-contain" />
        <p className="text-base text-gray-700 text-center">
          Select Symptoms
        </p>
      </PageContainer>
    ),
    (
      <PageContainer>
        <img src={onboarding4} alt="Onboarding Image 4" className="w-full h-auto object-contain" />
        <p className="text-base text-gray-700 text-center">
          Solutions
        </p>
      </PageContainer>
    ),
  ], []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg mx-4 bg-background text-foreground rounded-xl shadow-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">Step {step + 1} of {totalSteps}</div>
          <button onClick={finish} className="text-sm text-gray-500 hover:text-gray-800">Skip</button>
        </div>

        <div className="space-y-4">
          {pages[step]}
        </div>

        <div className="mt-6 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button onClick={finish} className="px-4 py-2 rounded-md border text-gray-700">Skip</button>
            <button
              onClick={next}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-95"
            >
              {isLastStep ? 'Continue to Sign in' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;


