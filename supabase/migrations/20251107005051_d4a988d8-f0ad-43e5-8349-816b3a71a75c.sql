-- Adicionar política para clientes verem horários ocupados de todos os appointments
-- Isso é necessário para o realtime funcionar corretamente
CREATE POLICY "Clients can view occupied slots"
ON public.appointments
FOR SELECT
USING (
  has_role(auth.uid(), 'cliente'::user_role)
);