import React, { useState, useEffect } from 'react';
import MobileHeader from "@/components/MobileHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/hooks/useAuth";

const Help = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ ispremium: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching profile data (even though Help page doesn't need real profile data)
    // This is just to satisfy the MobileHeader component's prop requirement
    const fetchProfile = async () => {
      setLoading(true);
      // In a real scenario, you might fetch user's premium status here if needed
      setProfile({ ispremium: user?.user_metadata?.isPremium || false });
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileHeader onRefresh={() => {}} isPremium={false} showBackButton={true} backButtonTarget="/profile" />
        <main className="px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <MobileHeader 
        onRefresh={() => {}} 
        isPremium={profile?.ispremium || false}
        showBackButton={true}
        backButtonTarget="/profile"
      />
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              📘 Oveon – Help & User Guide
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
              Welcome to Oveon, your all-in-one AI-powered repair guide for electronics and electrical devices. Oveon is built to make troubleshooting, repairing, and maintaining your devices simple, safe, and effective.
            </p>
          </div>

          {/* Scan Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🔍 Scan – Detect Problems Quickly
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li><span className="font-medium">How it works:</span> take a photo of a device part, AI analyzes it.</li>
              <li><span className="font-medium">What you get:</span> instant diagnosis, repair steps, tools list.</li>
              <li><span className="font-medium">Best practice:</span> good lighting, focus on problem area.</li>
              <li><span className="font-medium">Free vs Premium:</span> free = limited scans, premium = unlimited.</li>
            </ul>
          </div>

          {/* Repair Bot Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🤖 Repair Bot – Your AI Repair Assistant
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li>Chat with AI to describe problems.</li>
              <li>Gives step-by-step solutions, tools, and safety tips.</li>
              <li>Handles follow-up questions.</li>
              <li><span className="font-medium">Free vs Premium:</span> free = limited chats, premium = unlimited.</li>
            </ul>
          </div>

          {/* Community Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              💬 Community – Learn, Share, and Connect
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li>Ask questions, share repair stories, tips & tricks.</li>
              <li>Safe and supportive space.</li>
            </ul>
          </div>

          {/* Profile Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              👤 Profile – Make Oveon Yours
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li>Change avatar.</li>
              <li>Track scans, chats, contributions.</li>
              <li>Manage subscription.</li>
            </ul>
          </div>

          {/* Premium Experience Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              ⭐ Premium Experience – Unlock Full Power
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li>Unlimited scans & bot chats.</li>
              <li>Ad-free experience.</li>
              <li>Exclusive Premium UI.</li>
            </ul>
          </div>

          {/* Safety and Best Practices Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🛠 Safety and Best Practices
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li>Always unplug devices.</li>
              <li>Use proper tools.</li>
              <li>Work in well-lit spaces.</li>
              <li>Start simple, stop if unsafe.</li>
            </ul>
          </div>

          {/* Why Oveon? Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🚀 Why Oveon?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
              Combines AI guidance, scanning, community knowledge, and premium upgrades.
            </p>
          </div>

          {/* Quick Summary Section */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              ✅ Quick Summary
            </h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
              <li><span className="font-medium">Scan</span> → Detect problems fast.</li>
              <li><span className="font-medium">Repair Bot</span> → AI repair assistant.</li>
              <li><span className="font-medium">Community</span> → Shared learning.</li>
              <li><span className="font-medium">Profile</span> → Personalize and track.</li>
              <li><span className="font-medium">Premium</span> → Unlock full power.</li>
            </ul>
          </div>

          {/* Support Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              📩 Support
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
              If you need help, contact us at: <a href="mailto:aswinai0000@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">aswinai0000@gmail.com</a>
            </p>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Help;
