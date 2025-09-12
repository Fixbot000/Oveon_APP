import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isPremium: boolean;
  premiumUiEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUiEnabled, setPremiumUiEnabled] = useState(false);

  useEffect(() => {
    const updateUserTimezone = async (userId: string) => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await supabase
          .from('profiles')
          .update({ timezone })
          .eq('id', userId);
      } catch (error) {
        console.error("Error updating user timezone:", error);
      }
    };

    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('ispremium, premiumuienabled')
          .eq('id', userId)
          .single();

        if (error) throw error;
        
        setIsPremium(data?.ispremium || false);
        setPremiumUiEnabled(data?.premiumuienabled || false);
        
        // Update timezone on login
        updateUserTimezone(userId);
      } catch (error) {
        console.error("Error fetching user profile in AuthProvider:", error);
        setIsPremium(false);
        setPremiumUiEnabled(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setIsPremium(false);
          setPremiumUiEnabled(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsPremium(false);
        setPremiumUiEnabled(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setIsPremium(false);
      setPremiumUiEnabled(false);
      window.location.href = '/'; // Redirect to home page or login page
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isPremium,
    premiumUiEnabled,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};