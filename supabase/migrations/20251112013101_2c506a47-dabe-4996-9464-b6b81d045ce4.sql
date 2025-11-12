-- Criar tabela de configurações do sistema
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas gerentes podem gerenciar configurações
CREATE POLICY "Gerentes podem visualizar configurações"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem criar configurações"
  ON public.settings
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

CREATE POLICY "Gerentes podem atualizar configurações"
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'gerente'::user_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir mensagem padrão do WhatsApp
INSERT INTO public.settings (key, value, description) VALUES (
  'whatsapp_message_template',
  'Olá {{nome}}! 👋

Este é um lembrete do seu agendamento na *Innovation Barbershop*:

📅 *Data:* {{data}}
🕐 *Horário:* {{hora}}
✂️ *Serviço:* {{servico}}
💈 *Barbeiro:* {{barbeiro}}

Contamos com sua presença!

Se precisar reagendar, entre em contato conosco.',
  'Template da mensagem de lembrete via WhatsApp. Use {{nome}}, {{data}}, {{hora}}, {{servico}}, {{barbeiro}} como variáveis.'
);