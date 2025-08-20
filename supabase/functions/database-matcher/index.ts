import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://byte-fixer.lovable.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

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

    const { aiAnalysis, deviceCategory } = await req.json();

    // Input validation
    if (!aiAnalysis || !deviceCategory) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Starting database matching for category:', deviceCategory);

    const matches = [];
    const searchTerms = [
      aiAnalysis.deviceType?.toLowerCase() || '',
      ...(aiAnalysis.specifications?.brand ? [aiAnalysis.specifications.brand.toLowerCase()] : []),
      ...(aiAnalysis.specifications?.model ? [aiAnalysis.specifications.model.toLowerCase()] : []),
      ...(aiAnalysis.visibleIssues?.map((issue: string) => issue.toLowerCase()) || [])
    ].filter(term => term.length > 2);

    console.log('Search terms:', searchTerms);

    // Search in appropriate table based on device category
    const tables = {
      'device': 'devices',
      'instrument': 'instruments', 
      'component': 'components',
      'pcb': 'pcbs',
      'board': 'boards'
    };

    const tableName = tables[deviceCategory as keyof typeof tables] || 'devices';
    console.log('Searching in table:', tableName);

    try {
      // Get all records from the specified table
      const { data: allRecords, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) {
        console.error('Database query error:', error);
        throw error;
      }

      console.log(`Found ${allRecords?.length || 0} records in ${tableName}`);

      // Score and rank matches
      for (const record of allRecords || []) {
        let score = 0;
        const matchedFields = [];

        // Check different fields based on table structure
        const searchableFields = getSearchableFields(tableName, record);
        
        for (const [fieldName, fieldValue] of Object.entries(searchableFields)) {
          if (typeof fieldValue === 'string' && fieldValue.length > 0) {
            const fieldLower = fieldValue.toLowerCase();
            
            for (const searchTerm of searchTerms) {
              if (fieldLower.includes(searchTerm)) {
                score += getFieldWeight(fieldName);
                matchedFields.push({ field: fieldName, term: searchTerm });
              }
            }
          }
        }

        // Only include records with some match
        if (score > 0) {
          matches.push({
            record,
            confidence: Math.min(score / 10, 1), // Normalize to 0-1
            matchedFields,
            tableName
          });
        }
      }

    } catch (dbError) {
      console.error(`Error querying ${tableName}:`, dbError);
    }

    // Sort by confidence and take top matches
    matches.sort((a, b) => b.confidence - a.confidence);
    const topMatches = matches.slice(0, 5);

    console.log(`Found ${topMatches.length} matches with scores:`, 
      topMatches.map(m => ({ confidence: m.confidence, device: getDeviceName(m.record, m.tableName) }))
    );

    return new Response(JSON.stringify(topMatches), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in database-matcher function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      matches: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getSearchableFields(tableName: string, record: any) {
  const commonFields = { id: record.id };
  
  switch (tableName) {
    case 'devices':
      return {
        ...commonFields,
        device: record.DEVICE || record.device || '',
        symptoms: record.SYMPTOMS || record.symptoms || '',
        reason: record.REASON || record.reason || '',
        diagnosis: record['PROBLEM DIAGNOSIS'] || record.diagnosis || '',
        tools: record['TOOLS NEEDED'] || record.tools || ''
      };
    
    case 'instruments':
      return {
        ...commonFields,
        device: record.Device || record.device || '',
        symptoms: record.Symptoms || record.symptoms || '',
        reasons: record.Reasons || record.reasons || '',
        diagnosis: record['Problem Diagnosis'] || record.diagnosis || '',
        tools: record['Tools Needed'] || record.tools || ''
      };
    
    case 'components':
      return {
        ...commonFields,
        name: record['Component Name'] || record.name || '',
        uses: record.Uses || record.uses || '',
        identify: record['How to Identify'] || record.identify || '',
        safety: record['Safety Tips'] || record.safety || ''
      };
    
    case 'pcbs':
      return {
        ...commonFields,
        problem: record.Problem || record.problem || '',
        solution: record.Solution || record.solution || '',
        explanation: record.Explanation || record.explanation || '',
        tools: record.Tools || record.tools || ''
      };
    
    case 'boards':
      return {
        ...commonFields,
        name: record['Board Name'] || record.name || '',
        info: record.Info || record.info || '',
        uses: record['Uses (how and where)'] || record.uses || '',
        language: record['Coding Language'] || record.language || ''
      };
    
    default:
      return commonFields;
  }
}

function getFieldWeight(fieldName: string): number {
  const weights: { [key: string]: number } = {
    device: 3,
    name: 3,
    problem: 2,
    symptoms: 2,
    diagnosis: 2,
    solution: 2,
    reason: 1.5,
    tools: 1,
    uses: 1,
    info: 0.5
  };
  
  return weights[fieldName] || 1;
}

function getDeviceName(record: any, tableName: string): string {
  switch (tableName) {
    case 'devices':
      return record.DEVICE || record.device || 'Unknown Device';
    case 'instruments':
      return record.Device || record.device || 'Unknown Instrument';
    case 'components':
      return record['Component Name'] || record.name || 'Unknown Component';
    case 'pcbs':
      return record.Problem || record.problem || 'PCB Issue';
    case 'boards':
      return record['Board Name'] || record.name || 'Unknown Board';
    default:
      return 'Unknown Item';
  }
}