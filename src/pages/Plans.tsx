import React from 'react';
import MobileHeader from "@/components/MobileHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Crown, DollarSign, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
// import { useNavigate } from 'react-router-dom'; // Removed
// import { ChevronLeft } from "lucide-react"; // Removed

const Plans = () => {
  const { user, isPremium: isPremiumUser } = useAuth();
  // const navigate = useNavigate(); // Removed
  // const isPremiumUser = user?.user_metadata?.isPremium || false; // This line is no longer needed

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

  const handleCancelPlan = async () => {
    if (!user) {
      alert('You must be logged in to cancel your plan.');
      return;
    }

    if (window.confirm('Are you sure you want to cancel your premium plan? Your premium benefits will continue until the end of the current billing cycle.')) {
      alert('Cancellation request received. Your plan will remain active until the end of the current billing cycle.');
      console.log('Simulating end of billing cycle...');
      
      // Simulate the end of the billing cycle (e.g., 5 seconds delay)
      setTimeout(async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ ispremium: false })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating premium status after cancellation:', error);
          alert('Failed to update premium status after billing cycle ended. Please contact support.');
        } else {
          alert('Your premium plan has now ended. You are now on the Free plan.');
          // Optionally, re-fetch user data to update UI
        }
      }, 5000); // 5 seconds delay for demonstration
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Removed old back button implementation */}
      <MobileHeader 
        onRefresh={() => {}} 
        isPremium={isPremiumUser}
        showBackButton={true}
        backButtonTarget="/profile"
      />
      <main className="px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold text-center">Our Plans</h1>

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
                  <Button className="w-full" variant="destructive" onClick={handleCancelPlan}>
                    Cancel Plan
                  </Button>
                ) : (
                  <Button className="w-full" variant={plan.isPremium ? 'default' : 'outline'}>
                    {plan.isCurrent ? 'Current Plan' : (plan.isPremium ? 'Upgrade Now' : 'Select Plan')}
                  </Button>
                )}
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
