-- Criar tabela para fechamentos de caixa
CREATE TABLE public.cash_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_date DATE NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  services_revenue NUMERIC NOT NULL DEFAULT 0,
  products_revenue NUMERIC NOT NULL DEFAULT 0,
  other_income NUMERIC NOT NULL DEFAULT 0,
  expenses NUMERIC NOT NULL DEFAULT 0,
  expenses_description TEXT,
  final_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  closed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(closing_date)
);

-- Enable RLS
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas gerentes podem gerenciar fechamentos
CREATE POLICY "Gerentes podem criar fechamentos"
ON public.cash_closings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem visualizar fechamentos"
ON public.cash_closings
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem atualizar fechamentos"
ON public.cash_closings
FOR UPDATE
USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem deletar fechamentos"
ON public.cash_closings
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cash_closings_updated_at
BEFORE UPDATE ON public.cash_closings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();