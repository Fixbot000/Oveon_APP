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
    },
    {
      title: "Laptop Thermal Paste Replacement",
      description: "Improve cooling performance with fresh thermal compound",
      category: "Laptop",
      difficulty: "Intermediate",
      readTime: "8 min read",
    },
    {
      title: "Audio Cable Repair Techniques",
      description: "Fix loose connections and restore audio quality",
      category: "Audio",
      difficulty: "Beginner",
      readTime: "5 min read",
    },
    {
      title: "Gaming Controller Maintenance",
      description: "Clean and lubricate for smooth button response",
      category: "Gaming",
      difficulty: "Beginner",
      readTime: "4 min read",
    },
    {
      title: "ESD Safety Best Practices",
      description: "Protect sensitive electronics from static damage",
      category: "Safety",
      difficulty: "Beginner",
      readTime: "3 min read",
    },
    {
      title: "Multimeter Circuit Testing",
      description: "Master essential electrical measurement techniques",
      category: "Tools",
      difficulty: "Intermediate",
      readTime: "6 min read",
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
