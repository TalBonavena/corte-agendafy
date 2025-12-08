-- Permitir que gerentes excluam assinaturas
CREATE POLICY "Gerentes can delete subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (has_role(auth.uid(), 'gerente'::user_role));