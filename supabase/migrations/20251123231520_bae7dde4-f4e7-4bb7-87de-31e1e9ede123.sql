-- Adiciona política RLS para permitir gerentes deletarem perfis
CREATE POLICY "Gerentes can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'gerente'::user_role));