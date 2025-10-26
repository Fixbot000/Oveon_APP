import React, { useState, useEffect } from 'react';
import BottomNavigation from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Crown, DollarSign, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlansProps {
  isScrolled: boolean;
}

const Plans = ({ isScrolled }: PlansProps) => {
  const { user, isPremium: isPremiumUser } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [premiumExpiryDate, setPremiumExpiryDate] = useState<Date | null>(null);
  const [showCancelledPremiumOptions, setShowCancelledPremiumOptions] = useState(false);
  const [isPremiumActiveButCancelled, setIsPremiumActiveButCancelled] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.premium_expiry) {
      const expiryDate = new Date(user.user_metadata.premium_expiry);
      setPremiumExpiryDate(expiryDate);

      // Show options if premium_expiry is in the future but user is not currently premium
      // or if the user has actively cancelled but premium is still active
      if ((expiryDate > new Date() && !isPremiumUser) || isPremiumActiveButCancelled) {
        setShowCancelledPremiumOptions(true);
      }
    }
  }, [user, isPremiumUser, isPremiumActiveButCancelled]);

  // This would ideally fetch actual plan data from an API
  const plans = [
    {
      name: 'Basic',
      price: '₹0',
      period: '/month',
      features: [
        'Limited diagnostics',
        'Basic repair tips',
        'Community access',
      ],
      isCurrent: !isPremiumUser,
      isPremium: false,
    },
    {
      name: 'Premium',
      price: '₹249',
      period: '/month',
      features: [
        'Unlimited diagnostics',
        'Advanced repair tips',
        'Priority support',
        'Projects',
        'Premium UI (Coming Soon)',
        'Exclusive community features',
      ],
      isCurrent: isPremiumUser,
      isPremium: true,
    },
  ];

  const handleSelectPlan = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      // Reset/extend premium by 28 days
      const premiumExpiry = new Date();
      premiumExpiry.setDate(premiumExpiry.getDate() + 28);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ispremium: true, 
          premium_expiry: premiumExpiry.toISOString() 
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Your premium subscription has been extended for 28 days!');
      
      // Reload to update auth context
      window.location.reload();
      setIsPremiumActiveButCancelled(false);
    } catch (error: any) {
      console.error('Error extending premium:', error);
      toast.error('Failed to extend premium subscription');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!user) return;

    // Confirm cancellation
    const confirmed = window.confirm(
      'Are you sure you want to cancel your premium plan? You will keep premium features until your current subscription expires.'
    );
    
    if (!confirmed) return;

    setUpdating(true);
    try {
      // Note: We keep ispremium = true until premium_expiry is reached
      // The auth context will handle the expiry check
      toast.success('Your premium plan has been cancelled. You will keep premium features until your subscription expires.');
      setIsPremiumActiveButCancelled(true);
    } catch (error: any) {
      console.error('Error cancelling plan:', error);
      toast.error('Failed to cancel premium plan');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-center">Our Plans</h1>

        {showCancelledPremiumOptions && premiumExpiryDate && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg flex flex-col items-center space-y-3" role="alert">
            <p className="font-bold">Premium Plan Cancelled</p>
            <p>You will retain premium features until: {premiumExpiryDate.toLocaleDateString()}</p>
            <Button
              className="w-fit"
              onClick={handleSelectPlan}
              disabled={updating}
            >
              {updating ? 'Processing...' : 'Back to Premium'}
            </Button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
          {plans.map((plan, index) => (
            <Card key={index} className={plan.isPremium ? 'border-yellow-500 shadow-lg' : ''}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  {plan.isPremium && <Crown className="h-6 w-6 text-yellow-500" />}
                  {plan.name}
                </CardTitle>
                <p className="text-4xl font-extrabold mt-4">
                  {plan.price}<span className="text-base font-medium text-muted-foreground">{plan.period}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.isPremium && isPremiumUser ? (
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={handleSelectPlan}
                      disabled={updating}
                    >
                      {updating ? 'Processing...' : 'Select Plan'}
                    </Button>
                    {!isPremiumActiveButCancelled && (
                      <Button 
                        className="w-full" 
                        variant="destructive" 
                        onClick={handleCancelPlan}
                        disabled={updating}
                      >
                        Cancel Plan
                      </Button>
                    )}
                  </div>
                ) : plan.isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Plans;
