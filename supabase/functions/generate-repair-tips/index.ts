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

    // Generate category-appropriate images for each tip
    console.log('Generating category-based images for tips...');
    
    for (let i = 0; i < tips.length; i++) {
      try {
        const tip = tips[i];
        let svgContent = '';
        
        // Create category-specific SVG illustrations
        switch (tip.category.toLowerCase()) {
          case 'smartphone':
            svgContent = `
              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:0.2" />
                  </linearGradient>
                </defs>
                <rect width="400" height="200" fill="#f8fafc"/>
                <rect x="150" y="40" width="100" height="120" rx="12" fill="url(#phoneGrad)" stroke="#3b82f6" stroke-width="2"/>
                <rect x="160" y="55" width="80" height="90" rx="4" fill="#1e40af" opacity="0.1"/>
                <circle cx="200" cy="160" r="8" fill="#3b82f6" opacity="0.3"/>
                <text x="200" y="185" text-anchor="middle" font-family="Arial" font-size="12" fill="#1e40af" font-weight="bold">Smartphone Repair</text>
              </svg>
            `;
            break;
            
          case 'laptop':
            svgContent = `
              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="laptopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#4338ca;stop-opacity:0.2" />
                  </linearGradient>
                </defs>
                <rect width="400" height="200" fill="#f8fafc"/>
                <rect x="120" y="80" width="160" height="100" rx="8" fill="url(#laptopGrad)" stroke="#6366f1" stroke-width="2"/>
                <rect x="130" y="90" width="140" height="80" rx="4" fill="#4338ca" opacity="0.1"/>
                <rect x="180" y="170" width="40" height="15" rx="2" fill="#6366f1" opacity="0.3"/>
                <text x="200" y="195" text-anchor="middle" font-family="Arial" font-size="12" fill="#4338ca" font-weight="bold">Laptop Repair</text>
              </svg>
            `;
            break;
            
          case 'audio':
            svgContent = `
              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="audioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:0.2" />
                  </linearGradient>
                </defs>
                <rect width="400" height="200" fill="#f8fafc"/>
                <circle cx="150" cy="100" r="35" fill="url(#audioGrad)" stroke="#8b5cf6" stroke-width="2"/>
                <circle cx="250" cy="100" r="35" fill="url(#audioGrad)" stroke="#8b5cf6" stroke-width="2"/>
                <path d="M185 100 Q 200 80 215 100" stroke="#8b5cf6" stroke-width="3" fill="none"/>
                <circle cx="150" cy="100" r="15" fill="#7c3aed" opacity="0.3"/>
                <circle cx="250" cy="100" r="15" fill="#7c3aed" opacity="0.3"/>
                <text x="200" y="175" text-anchor="middle" font-family="Arial" font-size="12" fill="#7c3aed" font-weight="bold">Audio Repair</text>
              </svg>
            `;
            break;
            
          case 'gaming':
            svgContent = `
              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#d97706;stop-opacity:0.2" />
                  </linearGradient>
                </defs>
                <rect width="400" height="200" fill="#f8fafc"/>
                <rect x="120" y="80" width="160" height="80" rx="25" fill="url(#gameGrad)" stroke="#f59e0b" stroke-width="2"/>
                <circle cx="160" cy="120" r="12" fill="#d97706" opacity="0.4"/>
                <circle cx="240" cy="110" r="8" fill="#d97706" opacity="0.4"/>
                <circle cx="260" cy="120" r="8" fill="#d97706" opacity="0.4"/>
                <circle cx="250" cy="140" r="8" fill="#d97706" opacity="0.4"/>
                <circle cx="230" cy="130" r="8" fill="#d97706" opacity="0.4"/>
                <text x="200" y="180" text-anchor="middle" font-family="Arial" font-size="12" fill="#d97706" font-weight="bold">Gaming Repair</text>
              </svg>
            `;
            break;
            
          case 'safety':
            svgContent = `
              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="safetyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#dc2626;stop-opacity:0.2" />
                  </linearGradient>
                </defs>
                <rect width="400" height="200" fill="#f8fafc"/>
                <path d="M200 60 L220 100 L180 100 Z" fill="url(#safetyGrad)" stroke="#ef4444" stroke-width="2"/>
                <circle cx="200" cy="85" r="4" fill="#dc2626"/>
                <rect x="198" y="92" width="4" height="12" fill="#dc2626"/>
                <circle cx="200" cy="130" r="30" fill="none" stroke="#ef4444" stroke-width="2"/>
                <path d="M185 130 L195 140 L215 120" stroke="#ef4444" stroke-width="3" fill="none"/>
                <text x="200" y="175" text-anchor="middle" font-family="Arial" font-size="12" fill="#dc2626" font-weight="bold">Safety First</text>
              </svg>
            `;
            break;
            
          case 'tools':
            svgContent = `
              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="toolsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#0891b2;stop-opacity:0.2" />
                  </linearGradient>
                </defs>
                <rect width="400" height="200" fill="#f8fafc"/>
                <rect x="160" y="80" width="8" height="60" fill="url(#toolsGrad)" stroke="#06b6d4" stroke-width="1"/>
                <circle cx="164" cy="75" r="6" fill="#0891b2" opacity="0.4"/>
                <rect x="180" y="90" width="40" height="8" fill="url(#toolsGrad)" stroke="#06b6d4" stroke-width="1"/>
                <circle cx="225" cy="94" r="6" fill="#0891b2" opacity="0.4"/>
                <path d="M190 110 L210 130 M190 130 L210 110" stroke="#06b6d4" stroke-width="2"/>
                <text x="200" y="165" text-anchor="middle" font-family="Arial" font-size="12" fill="#0891b2" font-weight="bold">Repair Tools</text>
              </svg>
            `;
            break;
            
          default:
            svgContent = `
              <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="200" fill="#f8fafc"/>
                <circle cx="200" cy="100" r="40" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" stroke-width="2"/>
                <path d="M180 100 L195 115 L220 85" stroke="#3b82f6" stroke-width="3" fill="none"/>
                <text x="200" y="160" text-anchor="middle" font-family="Arial" font-size="12" fill="#1e40af" font-weight="bold">Repair Tip</text>
              </svg>
            `;
        }
        
        const dataUrl = `data:image/svg+xml;base64,${btoa(svgContent.trim())}`;
        tips[i].imageUrl = dataUrl;
        
        console.log(`Generated ${tip.category} image for tip ${i + 1}: ${tip.title}`);
        
      } catch (imageError) {
        console.error(`Failed to generate image for tip ${i + 1}:`, imageError);
        // Create a generic fallback SVG
        const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="200" fill="#f8fafc"/>
            <circle cx="200" cy="100" r="40" fill="#3b82f6" opacity="0.1"/>
            <text x="200" y="105" text-anchor="middle" font-family="Arial" font-size="14" fill="#1e40af">Repair</text>
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
