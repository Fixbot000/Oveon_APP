import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GOOGLE_SEARCH_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { problems, description, deviceCategory, questionAnswers } = await req.json();

    console.log('Starting web search diagnosis for enhanced problem identification');

    // Create search query based on problems and description
    const searchQuery = `${deviceCategory} ${problems.map((p: any) => p.label).join(' ')} ${description} repair troubleshooting fix`;
    
    console.log('Search query:', searchQuery);

    let searchResults = '';
    let searchUsed = false;

    // Try Google Search if API key is available
    if (GOOGLE_SEARCH_API_KEY) {
      try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=017576662512468239146:omuauf_lfve&q=${encodeURIComponent(searchQuery)}&num=5`;
        
        const searchResponse = await fetch(searchUrl, {
          signal: AbortSignal.timeout(10000)
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          searchResults = searchData.items?.map((item: any) => 
            `${item.title}: ${item.snippet}`
          ).join('\n\n') || '';
          searchUsed = true;
          console.log('Google search completed successfully');
        }
      } catch (error) {
        console.warn('Google search failed:', error);
      }
    }

    // If search was successful, try Gemini first for processing
    if (searchUsed && GEMINI_API_KEY) {
      try {
        const geminiPrompt = `You are an expert problem diagnostic assistant. Based on the following information, provide a comprehensive diagnosis and repair solution.

Device: ${deviceCategory}
Identified Problems: ${JSON.stringify(problems)}
User Description: ${description}
Question Answers: ${JSON.stringify(questionAnswers)}
Web Search Results: ${searchResults}

Analyze all the information and provide a final diagnosis with repair steps.

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "finalDiagnosis": {
    "problem": "Primary problem identified",
    "explanation": "Detailed explanation of the issue",
    "confidence": "high|medium|low",
    "difficulty": "Beginner|Intermediate|Advanced|Professional",
    "timeRequired": "Estimated time needed",
    "estimatedCost": "Cost estimate or 'Contact technician for quote'",
    "successRate": "Percentage likelihood of successful repair",
    "safetyWarnings": ["Warning 1", "Warning 2"],
    "toolsNeeded": ["Tool 1", "Tool 2", "Tool 3"],
    "repairSteps": ["Step 1", "Step 2", "Step 3"]
  },
  "source": "gemini_search"
}`;

        console.log('Calling Gemini API for search result processing');

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: geminiPrompt }]
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1500,
              }
            }),
            signal: AbortSignal.timeout(30000)
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (geminiText) {
            const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              console.log('Gemini search processing completed successfully');
              
              return new Response(JSON.stringify({
                success: true,
                ...result
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }
      } catch (error) {
        console.warn('Gemini search processing failed:', error);
      }
    }

    // Fallback to ChatGPT if Gemini fails or no search results
    if (OPENAI_API_KEY) {
      try {
        const chatgptPrompt = `You are an expert electronics repair technician. Based on the following information, provide a comprehensive diagnosis and repair solution.

Device: ${deviceCategory}
Identified Problems: ${JSON.stringify(problems)}
User Description: ${description}
Question Answers: ${JSON.stringify(questionAnswers)}
${searchUsed ? `Web Search Results: ${searchResults}` : ''}

Analyze all the information and provide a final diagnosis with repair steps.

Return ONLY a valid JSON object with this exact structure:
{
  "finalDiagnosis": {
    "problem": "Primary problem identified",
    "explanation": "Detailed explanation of the issue",
    "confidence": "high|medium|low",
    "difficulty": "Beginner|Intermediate|Advanced|Professional",
    "timeRequired": "Estimated time needed",
    "estimatedCost": "Cost estimate or 'Contact technician for quote'",
    "successRate": "Percentage likelihood of successful repair",
    "safetyWarnings": ["Warning 1", "Warning 2"],
    "toolsNeeded": ["Tool 1", "Tool 2", "Tool 3"],
    "repairSteps": ["Step 1", "Step 2", "Step 3"]
  },
  "source": "chatgpt_fallback"
}`;

        console.log('Calling ChatGPT API as fallback');

        const chatgptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert electronics repair technician. Always respond with valid JSON only.' },
              { role: 'user', content: chatgptPrompt }
            ],
            max_tokens: 1500,
            temperature: 0.1
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (chatgptResponse.ok) {
          const chatgptData = await chatgptResponse.json();
          const chatgptText = chatgptData.choices?.[0]?.message?.content;

          if (chatgptText) {
            const jsonMatch = chatgptText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              console.log('ChatGPT fallback diagnosis completed successfully');
              
              return new Response(JSON.stringify({
                success: true,
                ...result
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
        }
      } catch (error) {
        console.warn('ChatGPT fallback failed:', error);
      }
    }

    // Ultimate fallback - guaranteed response
    console.log('Providing guaranteed fallback diagnosis');
    
    const guaranteedDiagnosis = {
      finalDiagnosis: {
        problem: problems.length > 0 ? problems[0].label : "Device malfunction",
        explanation: "Based on the available information, this appears to be a hardware-related issue that requires further investigation.",
        confidence: "low",
        difficulty: "Professional",
        timeRequired: "1-3 hours",
        estimatedCost: "Contact technician for quote",
        successRate: "60-80%",
        safetyWarnings: [
          "Always power off the device before inspection",
          "Consider professional help for complex repairs"
        ],
        toolsNeeded: ["Basic screwdriver set", "Multimeter", "Anti-static wrist strap"],
        repairSteps: [
          "Power off the device completely",
          "Perform visual inspection for obvious damage",
          "Check all connections and cables",
          "Test with multimeter if safe to do so",
          "Consult professional technician if problem persists"
        ]
      },
      source: "guaranteed_fallback"
    };

    return new Response(JSON.stringify({
      success: true,
      ...guaranteedDiagnosis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in web-search-diagnosis-v3:', error);
    
    // Emergency fallback
    const emergencyDiagnosis = {
      finalDiagnosis: {
        problem: "Analysis failed",
        explanation: "Please try again or consult a professional technician.",
        confidence: "low",
        difficulty: "Professional",
        timeRequired: "Unknown",
        estimatedCost: "Contact technician for quote",
        successRate: "Unknown",
        safetyWarnings: ["Consult professional help"],
        toolsNeeded: ["Professional assessment required"],
        repairSteps: ["Contact qualified technician"]
      },
      source: "emergency_fallback"
    };

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      ...emergencyDiagnosis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});