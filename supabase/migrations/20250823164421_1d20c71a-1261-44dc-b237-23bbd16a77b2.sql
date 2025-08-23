-- Fix the constraint issue that's causing problems
-- Remove the problematic constraint and fix the function

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_check;

-- Update the function to set the id correctly and add search_path security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$;