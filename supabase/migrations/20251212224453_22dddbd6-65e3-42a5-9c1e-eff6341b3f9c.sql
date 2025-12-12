-- Create services table to store customizable services
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  duration TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Everyone can view active services
CREATE POLICY "Everyone can view active services"
ON public.services
FOR SELECT
USING (is_active = true);

-- Managers can do everything
CREATE POLICY "Gerentes podem visualizar todos serviços"
ON public.services
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem criar serviços"
ON public.services
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem atualizar serviços"
ON public.services
FOR UPDATE
USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem deletar serviços"
ON public.services
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create subscription_plans table for different plan types
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  cuts_per_week INTEGER NOT NULL DEFAULT 1,
  allowed_services TEXT[] NOT NULL DEFAULT ARRAY['Corte']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Everyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Managers can do everything
CREATE POLICY "Gerentes podem visualizar todos planos"
ON public.subscription_plans
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem criar planos"
ON public.subscription_plans
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem atualizar planos"
ON public.subscription_plans
FOR UPDATE
USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem deletar planos"
ON public.subscription_plans
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services from existing lib/services.ts
INSERT INTO public.services (name, duration, price, display_order) VALUES
('Acabamento', '5min', 7.00, 1),
('Acabamento+Barba', '30min', 32.00, 2),
('Acabamento+Barba+Sobrancelha', '30min', 39.00, 3),
('Barba', '25min', 25.00, 4),
('Corte', '30min', 30.00, 5),
('Cone Hidu', '25min', 15.00, 6),
('Cone Hidu+Corte', '1hr', 45.00, 7),
('Corte+Barba', '1hr', 55.00, 8),
('Corte+Barba+Sobrancelha', '1hr', 62.00, 9),
('Corte+Depilação Nasal', '1hr', 45.00, 10),
('Corte+Sobrancelha', '30min', 37.00, 11);

-- Insert default subscription plan
INSERT INTO public.subscription_plans (name, description, price, cuts_per_week, allowed_services, display_order) VALUES
('Plano Cabelo Semanal', '1 corte por semana garantido', 80.00, 1, ARRAY['Corte']::TEXT[], 1);