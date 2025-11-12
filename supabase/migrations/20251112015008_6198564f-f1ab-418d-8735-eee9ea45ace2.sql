-- Criar bucket de storage para fotos de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Adicionar coluna image_url na tabela products
ALTER TABLE public.products
ADD COLUMN image_url TEXT;

-- Políticas RLS para o bucket de produtos
CREATE POLICY "Gerentes podem fazer upload de imagens de produtos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'gerente'::user_role)
);

CREATE POLICY "Gerentes podem atualizar imagens de produtos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'gerente'::user_role)
);

CREATE POLICY "Gerentes podem deletar imagens de produtos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'gerente'::user_role)
);

CREATE POLICY "Imagens de produtos são públicas para leitura"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');