-- Enable RLS on the remaining tables that have policies but RLS disabled
-- These are the tables causing the "Policy Exists RLS Disabled" errors

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;