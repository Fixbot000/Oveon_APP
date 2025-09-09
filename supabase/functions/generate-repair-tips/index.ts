import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndScans } from "../helpers.ts";

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
  fullDescription: string;
  imageUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization required',
        success: false
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    // Premium feature check
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase URL or service role key not found");
    }

    const { allowed, error: premiumError } = await checkPremiumAndScans(userId, supabaseServiceRoleKey, supabaseUrl);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: premiumError || 'Premium feature check failed.',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    console.log('Generating repair tips with Gemini AI...');

    // Generate tips using Gemini AI
    const prompt = `Generate 6 unique, practical repair tips and tricks for DIY device repair enthusiasts. 

Return a JSON array where each tip has these exact fields:
- title: Catchy, specific title (max 60 characters)
- description: Brief, practical description (max 120 characters)
- category: One of: "Smartphone", "Laptop", "Audio", "Gaming", "Safety", "Tools"
- difficulty: One of: "Beginner", "Intermediate", "Advanced"
- readTime: Format like "3 min read", "5 min read", etc.
- fullDescription: A detailed explanation of the tip (200-500 characters)

Focus on:
- Practical, actionable advice
- Safety considerations
- Common repair scenarios
- Tool recommendations
- Preventive maintenance
- Troubleshooting steps

Make tips diverse across different skill levels and device types.`;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates[0].content.parts[0].text;

    console.log('Gemini response received:', aiResponse);

    // Parse the AI response to extract structured tips
    let tips: Tip[] = [];
    
    try {
      // Try to parse JSON if the AI returns it
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          tips = parsed;
        }
      }
    } catch (parseError) {
      console.log('Failed to parse JSON, using fallback tips:', parseError);
    }

    // If we still don't have enough tips, provide fallback tips
    if (tips.length < 6) {
      console.log('Using fallback tips');
      const fallbackTips: Tip[] = [
        {
          title: "Smartphone Battery Optimization",
          description: "Extend battery life with proper charging habits and settings",
          category: "Smartphone",
          difficulty: "Beginner",
          readTime: "3 min read",
          fullDescription: "Learn how to optimize your smartphone battery to last longer. This includes understanding charging cycles, using a power bank, and adjusting settings for better battery health.",
          imageUrl: `data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="200" fill="#f8fafc"/>
              <circle cx="200" cy="100" r="60" fill="#22c55e" opacity="0.1"/>
              <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#16a34a">Smartphone</text>
            </svg>
          `)}`
        },
        {
          title: "Laptop Thermal Paste Replacement",
          description: "Improve cooling performance with fresh thermal compound",
          category: "Laptop",
          difficulty: "Intermediate",
          readTime: "8 min read",
          fullDescription: "Discover the importance of thermal paste and how to replace it in your laptop. This guide will help you improve cooling efficiency and prevent overheating.",
          imageUrl: `data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="200" fill="#f8fafc"/>
              <circle cx="200" cy="100" r="60" fill="#3b82f6" opacity="0.1"/>
              <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#1e40af">Laptop</text>
            </svg>
          `)}`
        },
        {
          title: "Audio Cable Repair Techniques",
          description: "Fix loose connections and restore audio quality",
          category: "Audio",
          difficulty: "Beginner",
          readTime: "5 min read",
          fullDescription: "Learn how to repair damaged audio cables, fix loose connections, and restore audio quality. This is essential for maintaining your audio equipment.",
          imageUrl: `data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="200" fill="#f8fafc"/>
              <circle cx="200" cy="100" r="60" fill="#8b5cf6" opacity="0.1"/>
              <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#7c3aed">Audio</text>
            </svg>
          `)}`
        },
        {
          title: "Gaming Controller Maintenance",
          description: "Clean and lubricate for smooth button response",
          category: "Gaming",
          difficulty: "Beginner",
          readTime: "4 min read",
          fullDescription: "Discover how to clean and lubricate your gaming controller to ensure smooth button response and optimal performance.",
          imageUrl: `data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="200" fill="#f8fafc"/>
              <circle cx="200" cy="100" r="60" fill="#f59e0b" opacity="0.1"/>
              <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#d97706">Gaming</text>
            </svg>
          `)}`
        },
        {
          title: "ESD Safety Best Practices",
          description: "Protect sensitive electronics from static damage",
          category: "Safety",
          difficulty: "Beginner",
          readTime: "3 min read",
          fullDescription: "Learn how to prevent static electricity damage to your electronic devices. This includes using anti-static tools and following proper handling procedures.",
          imageUrl: `data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="200" fill="#f8fafc"/>
              <circle cx="200" cy="100" r="60" fill="#ef4444" opacity="0.1"/>
              <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#dc2626">Safety</text>
            </svg>
          `)}`
        },
        {
          title: "Multimeter Circuit Testing",
          description: "Master essential electrical measurement techniques",
          category: "Tools",
          difficulty: "Intermediate",
          readTime: "6 min read",
          fullDescription: "Discover how to use a multimeter for circuit testing, voltage measurement, and troubleshooting. This is a fundamental skill for any DIY electronics enthusiast.",
          imageUrl: `data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="200" fill="#f8fafc"/>
              <circle cx="200" cy="100" r="60" fill="#06b6d4" opacity="0.1"/>
              <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#0891b2">Tools</text>
            </svg>
          `)}`
        }
      ];
      
      tips = fallbackTips;
    }

    // Generate images for each tip using Gemini
    console.log('Generating images for tips...');
    
    for (let i = 0; i < tips.length; i++) {
      try {
        const imagePrompt = `Generate a simple, clean illustration showing ${tips[i].title.toLowerCase()}. The image should be minimalistic, educational, and clearly represent the repair concept. Use a clean white background with simple graphics that are easy to identify but not too detailed.`;
        
        const imageResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Create a data URL for a simple SVG illustration: ${imagePrompt}. Return only the complete data:image/svg+xml;base64,... URL, nothing else.`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1000,
            },
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const svgContent = imageData.candidates[0].content.parts[0].text;
          
          // Create a simple SVG as fallback if Gemini doesn't return proper data URL
          const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="200" fill="#f8fafc"/>
              <circle cx="200" cy="100" r="60" fill="#3b82f6" opacity="0.1"/>
              <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#1e40af">${tips[i].category}</text>
            </svg>
          `)}`;
          
          tips[i].imageUrl = svgContent.includes('data:image') ? svgContent.trim() : fallbackSvg;
          console.log(`Generated image for tip ${i + 1}`);
        }
      } catch (imageError) {
        console.error(`Failed to generate image for tip ${i + 1}:`, imageError);
        // Create a simple fallback SVG
        const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="200" fill="#f8fafc"/>
            <circle cx="200" cy="100" r="60" fill="#3b82f6" opacity="0.1"/>
            <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#1e40af">${tips[i].category}</text>
          </svg>
        `)}`;
        tips[i].imageUrl = fallbackSvg;
      }
    }
    console.log('Tips generated successfully');

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
