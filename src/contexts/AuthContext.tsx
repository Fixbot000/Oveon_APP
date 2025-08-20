import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, captchaToken?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, captchaToken?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const options: any = {
      emailRedirectTo: redirectUrl,
      data: {
        display_name: displayName
      }
    };
    
    // Only include CAPTCHA token if it's provided and not empty
    if (captchaToken && captchaToken.trim() !== '') {
      options.captchaToken = captchaToken;
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options
    });
    return { error };
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const options: any = {};
    
    // Only include CAPTCHA token if it's provided and not empty
    if (captchaToken && captchaToken.trim() !== '') {
      options.captchaToken = captchaToken;
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: Object.keys(options).length > 0 ? options : undefined
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};