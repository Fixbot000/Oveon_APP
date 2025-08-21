import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    console.log('Performing backup search with Google...');

    // Build search query from analysis
    const searchTerms = [
      aiAnalysis.deviceType || deviceCategory || '',
      ...(aiAnalysis.specifications?.brand ? [aiAnalysis.specifications.brand] : []),
      ...(aiAnalysis.specifications?.model ? [aiAnalysis.specifications.model] : []),
      ...(aiAnalysis.visibleIssues?.slice(0, 2) || []), // Limit to avoid too long query
      'repair', 'fix', 'troubleshooting'
    ].filter(term => term && term.trim().length > 0);

    const searchQuery = searchTerms.join(' ').substring(0, 100); // Limit query length
    console.log('Search query:', searchQuery);

    let searchResults;

    // Check if Google Search API is available
    if (!GOOGLE_SEARCH_API_KEY) {
      console.warn('GOOGLE_SEARCH_API_KEY not configured, using fallback results');
      searchResults = createFallbackResults(searchQuery, deviceCategory, aiAnalysis, symptomsText);
    } else {
      try {
        // Use Google Custom Search API
        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.set('key', GOOGLE_SEARCH_API_KEY);
        searchUrl.searchParams.set('cx', GOOGLE_CSE_ID);
        searchUrl.searchParams.set('q', searchQuery);
        searchUrl.searchParams.set('num', '10'); // Get top 10 results
        searchUrl.searchParams.set('safe', 'active');

        console.log('Calling Google Search API...');
        const response = await fetch(searchUrl.toString(), {
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
          throw new Error(`Google Search API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
          throw new Error('No search results found');
        }

        // Process search results
        searchResults = {
          query: searchQuery,
          totalResults: data.searchInformation?.totalResults || '0',
          searchTime: data.searchInformation?.searchTime || '0',
          results: data.items.slice(0, 5).map((item: any) => ({
            title: item.title || '',
            link: item.link || '',
            snippet: item.snippet || '',
            displayLink: item.displayLink || '',
            formattedUrl: item.formattedUrl || ''
          })),
          source: 'google_search_api'
        };

        console.log(`Google search completed: ${searchResults.results.length} results found`);

      } catch (googleError) {
        console.warn('Google Search API failed, using fallback results:', googleError);
        searchResults = createFallbackResults(searchQuery, deviceCategory, aiAnalysis, symptomsText, googleError.message);
      }
    }

    // Enhance search results with analysis context
    const enhancedResults = {
      ...searchResults,
      analysisContext: {
        deviceCategory,
        detectedIssues: aiAnalysis.visibleIssues || [],
        deviceType: aiAnalysis.deviceType || '',
        specifications: aiAnalysis.specifications || {},
        symptomsText: symptomsText || ''
      },
      searchStrategy: {
        primaryTerms: searchTerms.slice(0, 3),
        searchDomain: 'electronics repair',
        intentFocus: 'troubleshooting and repair guidance'
      },
      timestamp: new Date().toISOString()
    };

    console.log('Backup search completed successfully');

    return new Response(JSON.stringify(enhancedResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in backup-search function:', error);

    // Create fallback results even on complete failure
    const fallbackResults = {
      query: `${deviceCategory || 'device'} repair troubleshooting`,
      totalResults: "0",
      searchTime: "0",
      results: [
        {
          title: "General Electronics Repair Guide",
          link: "https://example.com/general-repair",
          snippet: "Basic electronics repair principles: disconnect power, inspect for damage, check connections, and use proper tools. Always prioritize safety.",
          displayLink: "example.com",
          formattedUrl: "https://example.com/general-repair"
        },
        {
          title: "Electronics Safety Guidelines",
          link: "https://example.com/safety-guide",
          snippet: "Safety first when repairing electronics: use anti-static equipment, verify power disconnection, and wear appropriate protective gear.",
          displayLink: "example.com", 
          formattedUrl: "https://example.com/safety-guide"
        }
      ],
      analysisContext: {
        deviceCategory: deviceCategory || 'unknown',
        detectedIssues: [],
        deviceType: '',
        specifications: {},
        symptomsText: ''
      },
      searchStrategy: {
        primaryTerms: [deviceCategory || 'device', 'repair'],
        searchDomain: 'electronics repair',
        intentFocus: 'general repair guidance'
      },
      timestamp: new Date().toISOString(),
      source: "error_fallback",
      error: error.message
    };

    return new Response(JSON.stringify(fallbackResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function createFallbackResults(searchQuery: string, deviceCategory: string, aiAnalysis: any, symptomsText: string, errorMessage?: string) {
  const categorySpecificResults = {
    'device': [
      {
        title: `${deviceCategory} Troubleshooting Guide - Step by Step Repair`,
        link: `https://example.com/repair-guide/${deviceCategory.toLowerCase()}`,
        snippet: `Comprehensive troubleshooting guide for ${deviceCategory} devices. Common issues include power failures, connection problems, and component malfunctions. Follow safety protocols when working with electronics.`,
        displayLink: "example.com",
        formattedUrl: `https://example.com/repair-guide/${deviceCategory.toLowerCase()}`
      },
      {
        title: `How to Fix Common ${deviceCategory} Problems - Electronics Repair`,
        link: `https://example.com/troubleshooting/${deviceCategory.toLowerCase()}`,
        snippet: `Step-by-step solutions for typical ${deviceCategory} issues. Check power supply, inspect connections, test components, and replace faulty parts as needed.`,
        displayLink: "example.com",
        formattedUrl: `https://example.com/troubleshooting/${deviceCategory.toLowerCase()}`
      },
      {
        title: `${deviceCategory} Repair Safety Guidelines and Best Practices`,
        link: `https://example.com/safety/${deviceCategory.toLowerCase()}`,
        snippet: `Essential safety considerations for ${deviceCategory} repair. Always disconnect power, use anti-static precautions, wear safety equipment, and work in proper lighting.`,
        displayLink: "example.com",
        formattedUrl: `https://example.com/safety/${deviceCategory.toLowerCase()}`
      }
    ],
    'instrument': [
      {
        title: `${deviceCategory} Calibration and Repair Manual`,
        link: `https://example.com/instrument-repair/${deviceCategory.toLowerCase()}`,
        snippet: `Professional repair guide for measuring instruments. Covers calibration procedures, component testing, and accuracy verification.`,
        displayLink: "example.com",
        formattedUrl: `https://example.com/instrument-repair/${deviceCategory.toLowerCase()}`
      }
    ],
    'component': [
      {
        title: `Electronic Component Testing and Replacement Guide`,
        link: `https://example.com/component-repair/${deviceCategory.toLowerCase()}`,
        snippet: `How to test and replace electronic components. Use multimeter, oscilloscope, and component tester for accurate diagnosis.`,
        displayLink: "example.com",
        formattedUrl: `https://example.com/component-repair/${deviceCategory.toLowerCase()}`
      }
    ],
    'pcb': [
      {
        title: `PCB Repair Techniques and Circuit Board Troubleshooting`,
        link: `https://example.com/pcb-repair/${deviceCategory.toLowerCase()}`,
        snippet: `Professional PCB repair methods. Trace repair, component replacement, solder joint inspection, and circuit analysis techniques.`,
        displayLink: "example.com",
        formattedUrl: `https://example.com/pcb-repair/${deviceCategory.toLowerCase()}`
      }
    ],
    'board': [
      {
        title: `Development Board Troubleshooting and Repair Guide`,
        link: `https://example.com/board-repair/${deviceCategory.toLowerCase()}`,
        snippet: `Comprehensive guide for development board issues. Programming problems, power supply issues, and component failures.`,
        displayLink: "example.com",
        formattedUrl: `https://example.com/board-repair/${deviceCategory.toLowerCase()}`
      }
    ]
  };

  const defaultResults = categorySpecificResults['device'];
  const specificResults = categorySpecificResults[deviceCategory] || defaultResults;

  return {
    query: searchQuery,
    totalResults: "0",
    searchTime: "0",
    results: specificResults,
    source: errorMessage ? "api_error_fallback" : "no_api_fallback",
    error: errorMessage
  };
}