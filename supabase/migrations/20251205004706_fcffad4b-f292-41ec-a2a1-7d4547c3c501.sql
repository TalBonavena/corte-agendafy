-- Criar tabela de assinaturas de planos
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Plano Cabelo Semanal',
  price NUMERIC NOT NULL DEFAULT 80.00,
  cuts_per_week INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Clients can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients can create their own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Gerentes can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes can update all subscriptions"
ON public.subscriptions
FOR UPDATE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();