import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { CheckCircle, Crown, ShieldCheck, DollarSign, FolderOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

const Premium = () => {
  const handleUpgrade = () => {
    // This is where you would integrate with your payment provider
    // For now, we'll just log a message.
    console.log('Initiating premium upgrade for ₹249/month');
    alert('Premium upgrade initiated! (This is a placeholder action)');
    // In a real application, you would redirect to a payment checkout flow
  };

  const { isPremium } = useAuth(); // Destructure isPremium from useAuth

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        onRefresh={() => {}} 
        isPremium={isPremium}
        showBackButton={true}
        backButtonTarget="/profile"
      />

      <main className="px-4 py-6 space-y-8">
        <h1 className="text-3xl font-bold text-center">Go Premium with Oveon!</h1>

        <Card className="bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-lg border-none">
          <CardHeader className="text-center">
            <Crown className="h-12 w-12 mx-auto mb-4" />
            <CardTitle className="text-4xl font-extrabold">Premium Plan</CardTitle>
            <p className="text-lg">Unlock the full power of Oveon</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline justify-center">
              <span className="text-5xl font-bold">₹249</span>
              <span className="text-xl font-medium">/month</span>
            </div>
            
            <ul className="space-y-3 text-lg">
              <li className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-700" />
                <span>Unlimited Scans</span>
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-700" />
                <span>Ad-Free Experience</span>
              </li>
              <li className="flex items-center gap-3">
                <FolderOpen className="h-6 w-6 text-green-700" />
                <span>Projects</span>
              </li>
              <li className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-green-700" />
                <span>Premium Badge on Profile</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-700" />
                <span>Exclusive Premium UI (Coming Soon)</span>
              </li>
            </ul>

            <Button 
              onClick={handleUpgrade}
              className="w-full bg-white text-yellow-600 hover:bg-gray-100 transition-colors py-3 text-xl font-bold rounded-lg shadow-md"
            >
              <DollarSign className="h-6 w-6 mr-2" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border-border mt-8">
          <CardHeader>
            <CardTitle className="text-2xl">Free Plan Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-base text-muted-foreground">
              <li className="flex items-center gap-2">
                <span>• 3 Scans per day (resets daily)</span>
              </li>
              <li className="flex items-center gap-2">
                <span>• Ads Displayed</span>
              </li>
              <li className="flex items-center gap-2">
                <span>• No Premium UI Toggle</span>
              </li>
              <li className="flex items-center gap-2">
                <span>• No Premium Badge</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Premium;
