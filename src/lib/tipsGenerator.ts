import { supabase } from '@/integrations/supabase/client';

export interface Tip {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  readTime: string;
  fullDescription: string;
  imageUrl?: string;
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
      title: "Battery Calibration",
      description: "Extend battery life with proper charging habits and settings",
      category: "Smartphone",
      difficulty: "Beginner",
      readTime: "3 min read",
      fullDescription: "Charge your phone to 100%, then use it until it powers off completely. Doing this once every 2–3 months recalibrates the battery meter, helping your device display accurate charge levels. This process teaches your phone where the true 0% and 100% marks are, improving battery life estimates and preventing unexpected shutdowns.",
      imageUrl: `data:image/svg+xml;base64,${btoa(`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="200" fill="#f8fafc"/>
          <circle cx="200" cy="100" r="60" fill="#22c55e" opacity="0.1"/>
          <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#16a34a">Smartphone</text>
        </svg>
      `)}`
    },
    {
      title: "Overheating Prevention",
      description: "Improve cooling performance with fresh thermal compound",
      category: "Laptop",
      difficulty: "Intermediate",
      readTime: "8 min read",
      fullDescription: "Clean your laptop's air vents monthly using compressed air to prevent dust buildup. Keep your device on hard, flat surfaces for proper airflow - never on beds or couches. If your laptop runs hot frequently, consider using a cooling pad or replacing the thermal paste every 2-3 years to maintain optimal temperatures.",
      imageUrl: `data:image/svg+xml;base64,${btoa(`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="200" fill="#f8fafc"/>
          <circle cx="200" cy="100" r="60" fill="#3b82f6" opacity="0.1"/>
          <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#1e40af">Laptop</text>
        </svg>
      `)}`
    },
    {
      title: "Audio Quality Fix",
      description: "Fix loose connections and restore audio quality",
      category: "Audio",
      difficulty: "Beginner",
      readTime: "5 min read",
      fullDescription: "Before replacing broken headphones, try cleaning the 3.5mm jack with a dry cotton swab to remove lint and debris. Gently wiggle the cable near the plug while playing audio to identify loose connections. For wireless earbuds, reset them by holding the pairing button for 10-15 seconds to resolve most connectivity issues.",
      imageUrl: `data:image/svg+xml;base64,${btoa(`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="200" fill="#f8fafc"/>
          <circle cx="200" cy="100" r="60" fill="#8b5cf6" opacity="0.1"/>
          <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#7c3aed">Audio</text>
        </svg>
      `)}`
    },
    {
      title: "Controller Drift Fix",
      description: "Clean and lubricate for smooth button response",
      category: "Gaming",
      difficulty: "Beginner",
      readTime: "4 min read",
      fullDescription: "Fix analog stick drift by lifting the rubber skirt around the joystick and spraying compressed air underneath to remove debris. For persistent drift, try recalibrating in your console's settings menu. Clean sticky buttons by dampening a cotton swab with isopropyl alcohol and gently cleaning around each button's edges.",
      imageUrl: `data:image/svg+xml;base64,${btoa(`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="200" fill="#f8fafc"/>
          <circle cx="200" cy="100" r="60" fill="#f59e0b" opacity="0.1"/>
          <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#d97706">Gaming</text>
        </svg>
      `)}`
    },
    {
      title: "Storage Cleaning",
      description: "Protect sensitive electronics from static damage",
      category: "Storage",
      difficulty: "Beginner",
      readTime: "3 min read",
      fullDescription: "Free up device storage by clearing app caches monthly through Settings > Storage. Delete old downloads, screenshots, and videos you no longer need. For photos, enable cloud backup before deleting originals. Uninstall apps you haven't used in 3+ months to maintain optimal device performance and prevent slowdowns.",
      imageUrl: `data:image/svg+xml;base64,${btoa(`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="200" fill="#f8fafc"/>
          <circle cx="200" cy="100" r="60" fill="#ef4444" opacity="0.1"/>
          <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#dc2626">Safety</text>
        </svg>
      `)}`
    },
    {
      title: "Charging Care",
      description: "Master essential electrical measurement techniques",
      category: "Maintenance",
      difficulty: "Intermediate",
      readTime: "6 min read",
      fullDescription: "Avoid charging devices overnight to prevent battery stress from prolonged 100% charge states. Use original chargers when possible, as third-party chargers may deliver incorrect voltage. Keep charging ports clean by gently removing lint with a toothpick. Replace charging cables when you notice fraying to prevent damage to your device's charging circuit.",
      imageUrl: `data:image/svg+xml;base64,${btoa(`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="200" fill="#f8fafc"/>
          <circle cx="200" cy="100" r="60" fill="#06b6d4" opacity="0.1"/>
          <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#0891b2">Tools</text>
        </svg>
      `)}`
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
