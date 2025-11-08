-- Fix privilege escalation: Always assign 'cliente' role on signup
-- Replace the existing handle_new_user function to ignore user-supplied roles

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile with user's name and email
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  
  -- SECURITY FIX: Always assign 'cliente' role, ignore user-supplied role
  -- Only administrators can promote users to 'gerente' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    'cliente'::user_role
  );
  
  RETURN NEW;
END;
$$;