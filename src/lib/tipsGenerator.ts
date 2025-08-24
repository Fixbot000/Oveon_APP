import { supabase } from '@/integrations/supabase/client';

export interface Tip {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  readTime: string;
  fullDescription: string;
}

export const generateRepairTips = async (): Promise<Tip[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-repair-tips');
    
    if (error) {
      console.error('Error calling tips function:', error);
      throw error;
    }
    
    if (data?.success && data?.tips) {
      return data.tips;
    } else {
      throw new Error('Failed to generate tips');
    }
  } catch (error) {
    console.error('Error generating repair tips:', error);
    // Return fallback tips if the API fails
    return getFallbackTips();
  }
};

const getFallbackTips = (): Tip[] => {
  return [
    {
      title: "Smartphone Battery Optimization",
      description: "Extend battery life with proper charging habits and settings",
      category: "Smartphone",
      difficulty: "Beginner",
      readTime: "3 min read",
      fullDescription: "Learn how to optimize your smartphone's battery life through proper charging habits, power settings management, and background app control. This comprehensive guide covers battery calibration, charging cycles, and settings optimization.",
    },
    {
      title: "Laptop Thermal Paste Replacement",
      description: "Improve cooling performance with fresh thermal compound",
      category: "Laptop",
      difficulty: "Intermediate",
      readTime: "8 min read",
      fullDescription: "Step-by-step guide to replacing thermal paste on your laptop to improve cooling performance and reduce overheating. Includes tools needed, safety precautions, and detailed instructions for disassembly and reassembly.",
    },
    {
      title: "Audio Cable Repair Techniques",
      description: "Fix loose connections and restore audio quality",
      category: "Audio",
      difficulty: "Beginner",
      readTime: "5 min read",
      fullDescription: "Master the art of audio cable repair with this detailed guide covering soldering techniques, cable testing, and connection troubleshooting. Perfect for fixing headphones, speakers, and audio equipment.",
    },
    {
      title: "Gaming Controller Maintenance",
      description: "Clean and lubricate for smooth button response",
      category: "Gaming",
      difficulty: "Beginner",
      readTime: "4 min read",
      fullDescription: "Keep your gaming controllers in perfect condition with proper cleaning and maintenance techniques. Learn how to clean buttons, joysticks, and internal mechanisms for optimal gaming performance.",
    },
    {
      title: "ESD Safety Best Practices",
      description: "Protect sensitive electronics from static damage",
      category: "Safety",
      difficulty: "Beginner",
      readTime: "3 min read",
      fullDescription: "Essential guide to electrostatic discharge (ESD) safety when working with sensitive electronic components. Learn about grounding techniques, anti-static tools, and safe handling procedures.",
    },
    {
      title: "Multimeter Circuit Testing",
      description: "Master essential electrical measurement techniques",
      category: "Tools",
      difficulty: "Intermediate",
      readTime: "6 min read",
      fullDescription: "Comprehensive guide to using multimeters for circuit testing and electrical troubleshooting. Covers voltage, current, and resistance measurements, along with safety tips and best practices.",
    }
  ];
};

// Function to get badge color based on difficulty
export const getDifficultyColor = (difficulty: string): string => {
  const colorMap: Record<string, string> = {
    'Beginner': 'bg-green-500/10 text-green-600',
    'Intermediate': 'bg-blue-500/10 text-blue-600',
    'Advanced': 'bg-orange-500/10 text-orange-600'
  };
  
  return colorMap[difficulty] || 'bg-primary/10 text-primary';
};
