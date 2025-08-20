import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://byte-fixer.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

const GOOGLE_SEARCH_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID') || 'demo'; // Will use mock data if not configured

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { aiAnalysis, symptomsText, deviceCategory } = await req.json();

    // Input validation
    if (!aiAnalysis || !deviceCategory) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!GOOGLE_SEARCH_API_KEY) {
      throw new Error('GOOGLE_SEARCH_API_KEY is not configured');
    }

    console.log('Performing backup search with Google...');

    // Build search query from analysis
    const searchTerms = [
      aiAnalysis.deviceType || '',
      ...(aiAnalysis.specifications?.brand ? [aiAnalysis.specifications.brand] : []),
      ...(aiAnalysis.specifications?.model ? [aiAnalysis.specifications.model] : []),
      ...(aiAnalysis.visibleIssues?.slice(0, 2) || []), // Limit to avoid too long query
      'repair', 'troubleshooting', 'fix'
    ].filter(term => term && term.length > 2);

    const searchQuery = searchTerms.join(' ');
    console.log('Search query:', searchQuery);

    // Perform multiple searches for comprehensive results
    const searchResults = [];

    // Search 1: General repair information
    try {
      const repairQuery = `${searchQuery} repair guide troubleshooting`;
      const repairResults = await performGoogleSearch(repairQuery, 'Repair Guides');
      searchResults.push(...repairResults);
    } catch (error) {
      console.warn('Repair search failed:', error);
    }

    // Search 2: Parts and components
    try {
      const partsQuery = `${aiAnalysis.deviceType} replacement parts components`;
      const partsResults = await performGoogleSearch(partsQuery, 'Parts & Components');
      searchResults.push(...partsResults);
    } catch (error) {
      console.warn('Parts search failed:', error);
    }

    // Search 3: Video tutorials (YouTube, etc.)
    try {
      const videoQuery = `${searchQuery} repair tutorial video youtube`;
      const videoResults = await performGoogleSearch(videoQuery, 'Video Tutorials');
      searchResults.push(...videoResults);
    } catch (error) {
      console.warn('Video search failed:', error);
    }

    const results = {
      searchQuery,
      totalResults: searchResults.length,
      results: searchResults.slice(0, 10), // Limit results
      searchTimestamp: new Date().toISOString(),
      categories: ['Repair Guides', 'Parts & Components', 'Video Tutorials']
    };

    console.log(`Backup search completed with ${results.totalResults} results`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in backup-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      results: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performGoogleSearch(query: string, category: string) {
  if (!GOOGLE_SEARCH_API_KEY || GOOGLE_CSE_ID === 'demo') {
    // Return enhanced mock results for demonstration
    console.log(`Mock search for category "${category}": ${query}`);
    
    const mockResults = [];
    const queryLower = query.toLowerCase();
    
    // Generate relevant mock results based on query content
    if (queryLower.includes('repair')) {
      mockResults.push({
        title: `Complete ${category} Guide: ${query.split(' ').slice(0, 3).join(' ')}`,
        link: 'https://ifixit.com/repair-guide',
        snippet: 'Step-by-step repair guide with detailed photos and instructions. Tools and parts list included. Difficulty: Moderate. Time required: 1-2 hours.',
        category,
        relevanceScore: 0.9
      });
    }
    
    if (queryLower.includes('parts') || queryLower.includes('components')) {
      mockResults.push({
        title: `${category}: Buy Original Parts & Components`,
        link: 'https://parts-supplier.com',
        snippet: 'Genuine replacement parts and components. Fast shipping worldwide. Compatible with all major brands. 1-year warranty included.',
        category,
        relevanceScore: 0.85
      });
    }
    
    if (queryLower.includes('tutorial') || queryLower.includes('video')) {
      mockResults.push({
        title: `YouTube: ${query} Tutorial [HD]`,
        link: 'https://youtube.com/watch',
        snippet: 'Professional repair tutorial video. Clear close-up shots of each step. Narrated by certified technician. 4.8/5 stars from 15K views.',
        category,
        relevanceScore: 0.8
      });
    }
    
    // Add generic helpful results
    mockResults.push({
      title: `Electronics Repair Forum: ${query}`,
      link: 'https://electronics-repair-forum.com',
      snippet: 'Community discussion about this exact issue. Multiple solutions and troubleshooting tips from experienced technicians.',
      category,
      relevanceScore: 0.75
    });
    
    return mockResults.slice(0, 2); // Return top 2 mock results
  }

  // Real Google Search implementation (when API key and CSE ID are configured)
  try {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=3`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      category,
      relevanceScore: calculateRelevance(item, query)
    }));
    
  } catch (error) {
    console.error(`Search failed for category ${category}:`, error);
    return [];
  }
}

function calculateRelevance(item: any, query: string): number {
  // Simple relevance scoring based on query terms in title and snippet
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  const queryTerms = query.toLowerCase().split(' ');
  
  let score = 0;
  for (const term of queryTerms) {
    if (text.includes(term)) {
      score += 0.1;
    }
  }
  
  return Math.min(score, 1.0);
}