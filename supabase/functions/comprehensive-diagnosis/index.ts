import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GOOGLE_SEARCH_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sessionId, 
      imageAnalysis, 
      description, 
      clarifyingAnswers, 
      descriptionAnswers, 
      deviceCategory 
    } = await req.json();

    console.log('Starting comprehensive diagnosis for session:', sessionId);

    // Step 1: Search database for matches
    console.log('Step 1: Searching database for matches...');
    const databaseResults = await searchDatabase(description, deviceCategory, imageAnalysis);

    let finalDiagnosis;

    if (databaseResults.matches.length > 0) {
      console.log(`Found ${databaseResults.matches.length} database matches`);
      finalDiagnosis = {
        source: 'database',
        diagnosis: createDatabaseDiagnosis(databaseResults.matches[0], imageAnalysis),
        confidence: 'high',
        databaseMatches: databaseResults.matches
      };
    } else {
      console.log('No database matches, proceeding to search and AI analysis...');
      
      // Step 2: Google Search + Gemini processing
      console.log('Step 2: Performing Google Search...');
      const searchResults = await performGoogleSearch(description, deviceCategory);
      
      if (searchResults && searchResults.length > 0) {
        console.log(`Found ${searchResults.length} search results, processing with Gemini...`);
        
        // Try Gemini first
        const geminiDiagnosis = await processWithGemini(
          searchResults, 
          description, 
          imageAnalysis, 
          clarifyingAnswers, 
          descriptionAnswers,
          deviceCategory
        );
        
        if (geminiDiagnosis.success) {
          finalDiagnosis = {
            source: 'gemini_search',
            diagnosis: geminiDiagnosis.diagnosis,
            confidence: 'medium',
            searchResults: searchResults.slice(0, 3)
          };
        } else {
          // Step 3: ChatGPT fallback
          console.log('Gemini failed, trying ChatGPT fallback...');
          const chatgptDiagnosis = await processWithChatGPT(
            searchResults, 
            description, 
            imageAnalysis, 
            clarifyingAnswers, 
            descriptionAnswers,
            deviceCategory
          );
          
          if (chatgptDiagnosis.success) {
            finalDiagnosis = {
              source: 'chatgpt_search',
              diagnosis: chatgptDiagnosis.diagnosis,
              confidence: 'medium',
              searchResults: searchResults.slice(0, 3)
            };
          } else {
            finalDiagnosis = createFallbackDiagnosis(description, deviceCategory, imageAnalysis);
          }
        }
      } else {
        finalDiagnosis = createFallbackDiagnosis(description, deviceCategory, imageAnalysis);
      }
    }

    // Update session with results
    await supabase
      .from('diagnostic_sessions')
      .update({
        ai_analysis: finalDiagnosis,
        status: 'completed'
      })
      .eq('id', sessionId);

    console.log('Comprehensive diagnosis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      diagnosis: finalDiagnosis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in comprehensive-diagnosis:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function searchDatabase(description: string, deviceCategory: string, imageAnalysis: any) {
  try {
    const table = getTableFromCategory(deviceCategory);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(10);

    if (error || !data) {
      return { matches: [] };
    }

    // Simple keyword matching
    const descLower = description.toLowerCase();
    const problems = imageAnalysis?.likelyProblems || [];
    const searchTerms = [...descLower.split(' '), ...problems.map((p: string) => p.toLowerCase())];
    
    const matches = data
      .map(record => {
        const searchableText = Object.values(record).join(' ').toLowerCase();
        const matchScore = searchTerms.reduce((score, term) => {
          if (term.length > 3 && searchableText.includes(term)) {
            return score + 1;
          }
          return score;
        }, 0);
        
        return { record, score: matchScore };
      })
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return { matches: matches.map(m => m.record) };
  } catch (error) {
    console.warn('Database search failed:', error);
    return { matches: [] };
  }
}

async function performGoogleSearch(description: string, deviceCategory: string) {
  try {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_CSE_ID) {
      return null;
    }

    const query = `${deviceCategory} repair "${description}" troubleshooting fix`;
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=5`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (response.ok) {
      const data = await response.json();
      return data.items || [];
    }

    return null;
  } catch (error) {
    console.warn('Google search failed:', error);
    return null;
  }
}

async function processWithGemini(searchResults: any[], description: string, imageAnalysis: any, clarifyingAnswers: any, descriptionAnswers: any, deviceCategory: string) {
  try {
    if (!GEMINI_API_KEY) {
      return { success: false };
    }

    const searchContent = searchResults.map(item => `${item.title}: ${item.snippet}`).join('\n');
    const answersText = Object.entries({...clarifyingAnswers, ...descriptionAnswers})
      .filter(([_, answer]) => answer && answer.trim())
      .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
      .join('\n\n');

    const prompt = `You are an expert electronics repair technician. Based on the search results and user information, provide a comprehensive diagnosis.

Device Category: ${deviceCategory}
User Description: ${description}
Image Analysis: ${JSON.stringify(imageAnalysis)}

User Q&A:
${answersText}

Search Results:
${searchContent}

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "problem": "Specific identified problem",
  "explanation": "Detailed explanation of what's wrong",
  "repairSteps": [
    "Step 1: Detailed instruction",
    "Step 2: Detailed instruction", 
    "Step 3: Detailed instruction"
  ],
  "toolsNeeded": ["tool1", "tool2", "tool3"],
  "estimatedCost": "Cost range estimate",
  "difficulty": "Beginner|Intermediate|Advanced|Professional",
  "safetyWarnings": ["warning1", "warning2"],
  "successRate": "percentage estimate"
}

Provide specific, actionable repair guidance based on the search results and user information.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    if (response.ok) {
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const diagnosis = JSON.parse(jsonMatch[0]);
          return { success: true, diagnosis };
        }
      }
    }

    return { success: false };
  } catch (error) {
    console.warn('Gemini processing failed:', error);
    return { success: false };
  }
}

async function processWithChatGPT(searchResults: any[], description: string, imageAnalysis: any, clarifyingAnswers: any, descriptionAnswers: any, deviceCategory: string) {
  try {
    if (!OPENAI_API_KEY) {
      return { success: false };
    }

    const searchContent = searchResults.map(item => `${item.title}: ${item.snippet}`).join('\n');
    const answersText = Object.entries({...clarifyingAnswers, ...descriptionAnswers})
      .filter(([_, answer]) => answer && answer.trim())
      .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
      .join('\n\n');

    const prompt = `Based on the search results and user information, provide a comprehensive repair diagnosis in JSON format:

Device: ${deviceCategory}
Description: ${description}
Image Analysis: ${JSON.stringify(imageAnalysis)}

User Q&A:
${answersText}

Search Results:
${searchContent}

Return JSON with: problem, explanation, repairSteps (array), toolsNeeded (array), estimatedCost, difficulty, safetyWarnings (array), successRate`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 1500
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const diagnosis = JSON.parse(jsonMatch[0]);
          return { success: true, diagnosis };
        }
      }
    }

    return { success: false };
  } catch (error) {
    console.warn('ChatGPT processing failed:', error);
    return { success: false };
  }
}

function createDatabaseDiagnosis(match: any, imageAnalysis: any) {
  return {
    problem: match.SYMPTOMS || match.Problem || "Device malfunction identified",
    explanation: match['PROBLEM DIAGNOSIS'] || match.Explanation || "Based on database match",
    repairSteps: (match['FIX STEPS'] || match.Solution || "Contact technician").split('\n'),
    toolsNeeded: (match['TOOLS NEEDED'] || match.Tools || "Basic tools").split(',').map((t: string) => t.trim()),
    estimatedCost: match['ESTIMATED REPAIR COST'] || "Varies",
    difficulty: "Intermediate",
    safetyWarnings: ["Ensure power is disconnected", "Use appropriate safety equipment"],
    successRate: "70-80%"
  };
}

function createFallbackDiagnosis(description: string, deviceCategory: string, imageAnalysis: any) {
  const problems = imageAnalysis?.likelyProblems || ["Unknown hardware issue"];
  
  return {
    source: 'fallback',
    diagnosis: {
      problem: problems[0] || "Device malfunction",
      explanation: `Based on your description of the ${deviceCategory} issue, this appears to be a common hardware problem that requires systematic troubleshooting.`,
      repairSteps: [
        "Check all power connections and cables",
        "Inspect for visible damage or loose components", 
        "Test with known working components if available",
        "Consult repair manual or seek professional help"
      ],
      toolsNeeded: ["Basic screwdrivers", "Multimeter", "Flashlight"],
      estimatedCost: "$50-200 depending on required parts",
      difficulty: "Intermediate",
      safetyWarnings: ["Disconnect power before opening device", "Avoid touching circuit boards"],
      successRate: "60-70%"
    },
    confidence: 'low'
  };
}

function getTableFromCategory(category: string): string {
  const categoryMap = {
    'device': 'devices',
    'instrument': 'instruments', 
    'component': 'components',
    'pcb': 'pcbs',
    'board': 'boards'
  };
  return categoryMap[category] || 'devices';
}