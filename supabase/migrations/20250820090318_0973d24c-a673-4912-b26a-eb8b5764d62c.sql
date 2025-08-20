-- Security fixes migration (fixed)
-- 1. Remove the "magic UUID" admin policy that allows unauthorized access
DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;

-- 2. Add proper input validation for diagnostic sessions
ALTER TABLE public.diagnostic_sessions 
ADD CONSTRAINT validate_status CHECK (status IN ('analyzing', 'matching', 'generating', 'completed', 'failed'));

-- 4. Add constraint to ensure diagnostic sessions have proper user ownership
ALTER TABLE public.diagnostic_sessions 
ALTER COLUMN user_id SET NOT NULL;