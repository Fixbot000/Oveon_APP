
import React from 'react';
import BottomNavigation from '@/components/BottomNavigation';
import CircuitGenerator from '../components/CircuitGenerator';

const CircuitPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-6 text-foreground">Circuit Generator</h1>
          
          <CircuitGenerator />
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default CircuitPage;
