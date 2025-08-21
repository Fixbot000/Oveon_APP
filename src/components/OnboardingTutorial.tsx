import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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

  const totalSteps = 3;

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
        <div className="flex items-center gap-3">
          <img
            src="/placeholder.svg"
            alt="ASwin logo"
            className="h-10 w-10 rounded-md object-contain border"
          />
          <h2 className="font-bold text-xl">👋 Welcome to ASwin</h2>
        </div>
        <p className="text-base text-gray-700">
          This app helps you easily diagnose issues, repair, and connect with the community.
        </p>
        <div className="pt-2">
          <h3 className="font-bold text-xl flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> 🔍 AI Diagnose</h3>
          <p className="text-base text-gray-700">
            Upload an image or describe the issue. Our AI will analyze it and give you solutions.
          </p>
        </div>
      </PageContainer>
    ),
    (
      <PageContainer>
        <h2 className="font-bold text-xl flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> 🤖 Repair Bot</h2>
        <p className="text-base text-gray-700">
          Chat with our AI just like ChatGPT or Gemini to ask questions, get help, and learn more.
        </p>
        <div className="pt-2">
          <h3 className="font-bold text-xl flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> 💬 Community</h3>
          <p className="text-base text-gray-700">
            Join discussions, share fixes, and learn from others.
          </p>
        </div>
        <div className="pt-2">
          <h3 className="font-bold text-xl flex items-center gap-2"><HistoryIcon className="h-5 w-5 text-primary" /> 📜 History</h3>
          <p className="text-base text-gray-700">
            All your scans, repairs, and posts are saved here for later.
          </p>
        </div>
      </PageContainer>
    ),
    (
      <PageContainer>
        <h2 className="font-bold text-xl flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> ⚙ Settings & <User className="h-5 w-5 text-primary" /> 👤 Profile</h2>
        <p className="text-base text-gray-700">
          Update your information and customize your app preferences.
        </p>
        <div className="pt-2">
          <h3 className="font-bold text-xl flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> 🎉 You're all set! Enjoy using ASwin.</h3>
        </div>
      </PageContainer>
    ),
  ], []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg mx-4 bg-background text-foreground rounded-xl shadow-xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">Step {step + 1} of {totalSteps}</div>
          <button onClick={finish} className="text-sm text-gray-500 hover:text-gray-800">Skip & Sign in</button>
        </div>

        <div className="space-y-4">
          {pages[step]}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={back}
            disabled={!canGoBack}
            className="px-4 py-2 rounded-md border text-gray-700 disabled:opacity-50"
          >
            Back
          </button>
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


