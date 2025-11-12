-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sale_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de vendas de produtos
CREATE TABLE public.product_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  total_sale DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  profit DECIMAL(10, 2) NOT NULL,
  sold_by UUID NOT NULL,
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para products
CREATE POLICY "Gerentes podem visualizar produtos"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem criar produtos"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem atualizar produtos"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem deletar produtos"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'gerente'::user_role));

-- Políticas RLS para product_sales
CREATE POLICY "Gerentes podem visualizar vendas"
  ON public.product_sales
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem registrar vendas"
  ON public.product_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

-- Trigger para atualizar updated_at em products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_product_sales_product_id ON public.product_sales(product_id);
CREATE INDEX idx_product_sales_sold_at ON public.product_sales(sold_at);