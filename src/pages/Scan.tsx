import React, { useState } from 'react';
import { Camera, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MobileHeader from '@/components/MobileHeader';
import BottomNavigation from '@/components/BottomNavigation';
import DiagnosticFlow from '@/components/DiagnosticFlow';
import { LanguageSelector } from '@/components/LanguageSelector';

const Scan = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader showSearch={false} onRefresh={() => window.location.reload()} />
      
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto mb-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Device Diagnosis</h1>
            <LanguageSelector 
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          </div>
        </div>
        <DiagnosticFlow selectedLanguage={selectedLanguage} />
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Scan;