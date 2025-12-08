-- Create expenses table for barbershop expenses (luz, água, internet, etc.)
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  expense_date DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Gerentes podem visualizar gastos
CREATE POLICY "Gerentes podem visualizar gastos"
ON public.expenses
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Gerentes podem criar gastos
CREATE POLICY "Gerentes podem criar gastos"
ON public.expenses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

-- Gerentes podem atualizar gastos
CREATE POLICY "Gerentes podem atualizar gastos"
ON public.expenses
FOR UPDATE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Gerentes podem deletar gastos
CREATE POLICY "Gerentes podem deletar gastos"
ON public.expenses
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();