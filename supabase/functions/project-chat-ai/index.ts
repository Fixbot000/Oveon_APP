import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { checkPremiumAndScans } from "../helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectFile {
  id: string;
  name: string;
  type: string;
  url?: string;
  content?: string;
}

interface ProjectMember {
  id: string;
  name: string;
  role: string;
}

interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: string;
}

interface ProjectContext {
  id: string;
  title: string;
  description: string;
  files?: ProjectFile[];
  members?: ProjectMember[];
  chatHistory?: ChatMessage[];
  progress?: any[];
  lastUpdated: string;
}

interface RequestBody {
  projectId: string;
  message: string;
  projectContext: ProjectContext;
}

interface ResponseBody {
  reply: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed. Use POST.',
        success: false 
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Extract user ID from JWT
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
        error: premiumError || 'Premium feature required.',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { projectId, message, projectContext }: RequestBody = await req.json();
    
    if (!projectId || !message || !projectContext) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request body. projectId, message, and projectContext are required.',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context prompt for ChatGPT
    const contextPrompt = buildProjectContextPrompt(projectContext, message);

    console.log('Project Chat AI - Processing message for project:', projectId);
    console.log('Context prompt length:', contextPrompt.length);

    // Call OpenAI API with Jarvis-like system prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are Jarvis, an intelligent project assistant. You help users manage and work on their projects with a professional, helpful, and slightly personal touch.

PERSONALITY:
- Conversational and natural (like Jarvis from Iron Man)
- Intelligent, structured, and proactive
- Helpful without being overwhelming
- Acknowledge progress and suggest next steps
- Ask clarifying questions when appropriate

BEHAVIOR RULES:
- Always refer to the specific project context provided
- When files are mentioned, acknowledge them and offer analysis
- Track project progress and suggest logical next steps
- Occasionally ask proactive questions like:
  "Would you like me to analyze this section further?"
  "Should I prepare a plan for the next stage?"
  "Would you like me to summarize progress so far?"
- Stay focused on THIS project only
- Never make up information not in the context

RESPONSE FORMAT:
- Natural conversational text (no JSON or raw data)
- Be concise but thorough
- Structure longer responses with clear points
- Always be project-aware and context-specific`
          },
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    console.log('Project Chat AI - Generated response length:', aiReply.length);

    const responseBody: ResponseBody = {
      reply: aiReply,
      success: true
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Project Chat AI error:', error);
    
    const responseBody: ResponseBody = {
      reply: '',
      success: false,
      error: error.message
    };

    return new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildProjectContextPrompt(projectContext: ProjectContext, userMessage: string): string {
  let prompt = `PROJECT CONTEXT:
Project: "${projectContext.title}"
Description: ${projectContext.description}
Last Updated: ${projectContext.lastUpdated}

`;

  // Add file information
  if (projectContext.files && projectContext.files.length > 0) {
    prompt += `UPLOADED FILES (${projectContext.files.length} files):
`;
    projectContext.files.forEach(file => {
      prompt += `- ${file.name} (${file.type})\n`;
    });
    prompt += '\n';
  } else {
    prompt += `UPLOADED FILES: None uploaded yet\n\n`;
  }

  // Add team members
  if (projectContext.members && projectContext.members.length > 0) {
    prompt += `TEAM MEMBERS:
`;
    projectContext.members.forEach(member => {
      prompt += `- ${member.name} (${member.role})\n`;
    });
    prompt += '\n';
  } else {
    prompt += `TEAM MEMBERS: None added yet\n\n`;
  }

  // Add recent chat history for context (last 5 messages)
  if (projectContext.chatHistory && projectContext.chatHistory.length > 0) {
    const recentHistory = projectContext.chatHistory.slice(-6); // Last 6 messages for context
    prompt += `RECENT CONVERSATION HISTORY:
`;
    recentHistory.forEach(msg => {
      if (msg.text !== "Thinking...") {
        prompt += `${msg.sender === 'user' ? 'User' : 'Jarvis'}: ${msg.text}\n`;
      }
    });
    prompt += '\n';
  }

  prompt += `CURRENT USER MESSAGE: ${userMessage}

Please respond as Jarvis, staying in character and being helpful with this specific project. Reference the project context appropriately.`;

  return prompt;
}