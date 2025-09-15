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
import Discussion from "./pages/Discussion";
import Profile from "./pages/Profile";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import { useEffect } from "react";
import History from "./pages/History";
import Premium from "./pages/Premium";
import Plans from "./pages/Plans";
import Help from "./pages/Help";
import DiagnosisResult from "./pages/DiagnosisResult";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";
import ProjectChat from "./pages/ProjectChat";
import { useTheme } from "@/hooks/useTheme"; // Import useTheme hook
import ReloadWrapper from "@/components/ReloadWrapper"; // Import ReloadWrapper

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  useTheme(); // Initialize theme handling

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
          <Route path="/" element={<ReloadWrapper><Index /></ReloadWrapper>} />
          <Route path="/auth" element={<ReloadWrapper><Auth /></ReloadWrapper>} />
          <Route path="/chat" element={<ReloadWrapper><Chat /></ReloadWrapper>} />
          <Route path="/shop" element={<ReloadWrapper><Shop /></ReloadWrapper>} />
          <Route path="/scan" element={
            <AuthGuard>
              <ReloadWrapper><Scan /></ReloadWrapper>
            </AuthGuard>
          } />
          <Route path="/community" element={
            <AuthGuard>
              <ReloadWrapper><Community /></ReloadWrapper>
            </AuthGuard>
          } />
          <Route path="/discussion/:postId" element={
            <AuthGuard>
              <ReloadWrapper><Discussion /></ReloadWrapper>
            </AuthGuard>
          } />
          <Route path="/history" element={
            <AuthGuard>
              <ReloadWrapper><History /></ReloadWrapper>
            </AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard>
              <ReloadWrapper><Profile /></ReloadWrapper>
            </AuthGuard>
          } />
          <Route path="/premium" element={<ReloadWrapper><Premium /></ReloadWrapper>} />
          <Route path="/plans" element={
            <AuthGuard>
              <ReloadWrapper><Plans /></ReloadWrapper>
            </AuthGuard>
          } />
          <Route path="/help" element={<ReloadWrapper><Help /></ReloadWrapper>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/diagnosis-result" element={<ReloadWrapper><DiagnosisResult /></ReloadWrapper>} />
          <Route path="/project/:projectId/chat" element={
            <AuthGuard>
              <ReloadWrapper><ProjectChat /></ReloadWrapper>
            </AuthGuard>
          } />
          <Route path="/terms-and-policies" element={<ReloadWrapper><TermsPage /></ReloadWrapper>} />
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
