import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_SEARCH_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
const GOOGLE_CSE_ID = 'YOUR_CUSTOM_SEARCH_ENGINE_ID'; // User needs to set this up

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { aiAnalysis, symptomsText, deviceCategory } = await req.json();

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
  if (!GOOGLE_SEARCH_API_KEY) {
    return [];
  }

  // Note: For now, returning mock results since CSE ID needs to be configured
  // In production, uncomment the actual Google search code below
  
  console.log(`Mock search for category "${category}": ${query}`);
  
  // Mock results for demonstration
  return [
    {
      title: `${category}: Mock Result for ${query}`,
      link: 'https://example.com/mock-result',
      snippet: 'This is a mock search result. Configure Google Custom Search Engine to get real results.',
      category,
      relevanceScore: 0.8
    }
  ];

  /*
  // Uncomment this section once Google CSE is configured:
  
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
  */
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