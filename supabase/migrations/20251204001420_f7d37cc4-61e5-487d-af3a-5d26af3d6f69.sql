CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile with user's name, email, and phone
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
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