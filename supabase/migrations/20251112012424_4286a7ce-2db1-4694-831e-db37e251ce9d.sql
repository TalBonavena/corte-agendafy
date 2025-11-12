-- Adicionar campo de telefone na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN phone TEXT;

-- Adicionar índice para melhor performance em buscas por telefone
CREATE INDEX idx_profiles_phone ON public.profiles(phone);