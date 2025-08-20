import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to access your account</p>
        </div>
        <AuthForm onSuccess={() => navigate('/')} />
      </div>
    </div>
  );
};

export default Auth;