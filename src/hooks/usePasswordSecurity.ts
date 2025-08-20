import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PasswordCheckResult {
  isCompromised: boolean;
  breachCount: number;
}

export const usePasswordSecurity = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkPasswordBreach = async (password: string): Promise<PasswordCheckResult | null> => {
    if (!password) return null;

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-password-breach', {
        body: { password }
      });

      if (error) {
        console.error('Password breach check error:', error);
        return null;
      }

      return data as PasswordCheckResult;
    } catch (error) {
      console.error('Password breach check failed:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkPasswordBreach,
    isChecking
  };
};