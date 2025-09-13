import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AuthFormProps {
  onSuccess?: () => void;
}

export const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const checkPasswordBreach = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-password-breach', {
        body: { password }
      });

      if (error) {
        console.error('Password breach check error:', error);
        // If check fails, allow password (fail open for better UX)
        return false;
      }

      return data?.isBreached || false;
    } catch (error) {
      console.error('Password breach check failed:', error);
      // If check fails, allow password (fail open for better UX)
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check for password breaches only during signup
      if (isSignUp) {
        const isBreached = await checkPasswordBreach(password);
        
        if (isBreached) {
          toast.error('This password has been found in data breaches. Please choose a stronger, unique password for your security.');
          setLoading(false);
          return;
        }

        // Terms of Service and Privacy Policy agreement check
        if (!agreedToTerms) {
          toast.error('You must agree to the Terms of Service and Privacy Policy to continue.');
          setLoading(false);
          return;
        }
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username: username
            }
          }
        });

        if (error) throw error;

        toast.success('Account created successfully! Please check your email to verify your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        toast.success('Signed in successfully!');
        onSuccess?.();
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
              placeholder="Enter your email"
            />
          </div>

          {isSignUp && (
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1"
                placeholder="Choose a username"
              />
            </div>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 pr-10"
                placeholder="Enter your password"
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {isSignUp && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
              />
              <Label htmlFor="terms" className="text-sm font-normal">
                I agree to the <a href="/terms-and-policies" className="underline">Terms and Conditions</a> and <a href="/terms-and-policies" className="underline">Privacy Policy</a>.
              </Label>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || (isSignUp && !agreedToTerms)}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};