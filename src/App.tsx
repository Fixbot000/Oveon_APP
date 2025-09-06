import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Shop from "./pages/Shop";
import Scan from "./pages/Scan";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import NotFound from "././pages/NotFound";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import { useEffect } from "react";
import History from "./pages/History";
import Premium from "./pages/Premium";
import Plans from "./pages/Plans";
import Help from "./pages/Help";
import DiagnosisResult from "./pages/DiagnosisResult";
import TermsAndPolicies from "./pages/TermsAndPolicies";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.user_metadata?.isPremium && user?.user_metadata?.premiumUiEnabled) {
      document.documentElement.classList.add('premium-ui');
    } else {
      document.documentElement.classList.remove('premium-ui');
    }
  }, [user]);

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OnboardingTutorial />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/community" element={
            <AuthGuard>
              <Community />
            </AuthGuard>
          } />
          <Route path="/history" element={
            <AuthGuard>
              <History />
            </AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard>
              <Profile />
            </AuthGuard>
          } />
          <Route path="/premium" element={<Premium />} />
          <Route path="/plans" element={
            <AuthGuard>
              <Plans />
            </AuthGuard>
          } />
          <Route path="/help" element={<Help />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/diagnosis-result" element={<DiagnosisResult />} />
          <Route path="/terms-and-policies" element={<TermsAndPolicies />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
