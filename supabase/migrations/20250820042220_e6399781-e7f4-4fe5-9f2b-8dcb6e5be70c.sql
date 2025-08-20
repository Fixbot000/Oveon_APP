-- Create storage bucket for device images
INSERT INTO storage.buckets (id, name, public) VALUES ('device-images', 'device-images', true);

-- Create storage policies for device images
CREATE POLICY "Authenticated users can upload device images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view device images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'device-images');

CREATE POLICY "Users can update their own device images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own device images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

-- Create diagnostic sessions table to track user diagnostic processes
CREATE TABLE public.diagnostic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_urls TEXT[],
  symptoms_text TEXT,
  device_category TEXT, -- 'device', 'instrument', 'component', 'pcb', 'board'
  ai_analysis JSONB,
  database_matches JSONB,
  repair_guidance JSONB,
  backup_search_results JSONB,
  status TEXT DEFAULT 'analyzing', -- 'analyzing', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on diagnostic sessions
ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for diagnostic sessions
CREATE POLICY "Users can view their own diagnostic sessions" 
ON public.diagnostic_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diagnostic sessions" 
ON public.diagnostic_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagnostic sessions" 
ON public.diagnostic_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diagnostic sessions" 
ON public.diagnostic_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_diagnostic_sessions_updated_at
BEFORE UPDATE ON public.diagnostic_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();