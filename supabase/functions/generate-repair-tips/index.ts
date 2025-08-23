import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Tip {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  readTime: string;
  imageAlt: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate a variety of repair tips using AI
    const systemMessage = {
      role: "system",
      content: `You are an expert electronics repair technician and educator. Generate 6 unique, practical repair tips and tricks that would be helpful for DIY device repair enthusiasts.

Each tip should include:
- A catchy, specific title (max 60 characters)
- A brief, practical description (max 120 characters)
- A relevant category (e.g., "Smartphone", "Laptop", "Audio", "Gaming", "Safety", "Tools")
- Difficulty level (e.g., "Beginner", "Intermediate", "Advanced")
- Estimated read time (e.g., "3 min read", "5 min read", "8 min read")
- A descriptive alt text for an image (max 80 characters)

Focus on:
- Practical, actionable advice
- Safety considerations
- Common repair scenarios
- Tool and technique recommendations
- Preventive maintenance
- Troubleshooting steps

Make the tips diverse and cover different skill levels and device types.`
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemMessage],
        max_tokens: 800,
        temperature: 0.8,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the AI response to extract structured tips
    // The AI should return tips in a structured format, but we'll provide a fallback
    let tips: Tip[] = [];
    
    try {
      // Try to parse JSON if the AI returns it
      const parsed = JSON.parse(aiResponse);
      if (Array.isArray(parsed)) {
        tips = parsed;
      }
    } catch {
      // If parsing fails, create tips from the text response
      const lines = aiResponse.split('\n').filter(line => line.trim());
      let currentTip: Partial<Tip> = {};
      
      for (const line of lines) {
        if (line.includes('Title:') || line.includes('title:')) {
          if (currentTip.title) {
            tips.push(currentTip as Tip);
          }
          currentTip = { title: line.split(':')[1]?.trim() || '' };
        } else if (line.includes('Description:') || line.includes('description:')) {
          currentTip.description = line.split(':')[1]?.trim() || '';
        } else if (line.includes('Category:') || line.includes('category:')) {
          currentTip.category = line.split(':')[1]?.trim() || '';
        } else if (line.includes('Difficulty:') || line.includes('difficulty:')) {
          currentTip.difficulty = line.split(':')[1]?.trim() || '';
        } else if (line.includes('Read time:') || line.includes('read time:')) {
          currentTip.readTime = line.split(':')[1]?.trim() || '';
        } else if (line.includes('Image alt:') || line.includes('image alt:')) {
          currentTip.imageAlt = line.split(':')[1]?.trim() || '';
        }
      }
      
      if (currentTip.title) {
        tips.push(currentTip as Tip);
      }
    }

    // If we still don't have enough tips, provide some fallback tips
    if (tips.length < 6) {
      const fallbackTips: Tip[] = [
        {
          title: "Smartphone Battery Optimization",
          description: "Extend battery life with proper charging habits and settings",
          category: "Smartphone",
          difficulty: "Beginner",
          readTime: "3 min read",
          imageAlt: "Smartphone battery optimization tips"
        },
        {
          title: "Laptop Thermal Paste Replacement",
          description: "Improve cooling performance with fresh thermal compound",
          category: "Laptop",
          difficulty: "Intermediate",
          readTime: "8 min read",
          imageAlt: "Laptop thermal paste application"
        },
        {
          title: "Audio Cable Repair Techniques",
          description: "Fix loose connections and restore audio quality",
          category: "Audio",
          difficulty: "Beginner",
          readTime: "5 min read",
          imageAlt: "Audio cable repair tools"
        },
        {
          title: "Gaming Controller Maintenance",
          description: "Clean and lubricate for smooth button response",
          category: "Gaming",
          difficulty: "Beginner",
          readTime: "4 min read",
          imageAlt: "Gaming controller disassembly"
        },
        {
          title: "ESD Safety Best Practices",
          description: "Protect sensitive electronics from static damage",
          category: "Safety",
          difficulty: "Beginner",
          readTime: "3 min read",
          imageAlt: "ESD protection equipment"
        },
        {
          title: "Multimeter Circuit Testing",
          description: "Master essential electrical measurement techniques",
          category: "Tools",
          difficulty: "Intermediate",
          readTime: "6 min read",
          imageAlt: "Multimeter testing circuit"
        }
      ];
      
      tips = fallbackTips;
    }

    return new Response(JSON.stringify({ 
      tips: tips.slice(0, 6),
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating tips:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
