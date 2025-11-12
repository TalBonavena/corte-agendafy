import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, RefreshCw } from "lucide-react";

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState("");
  const [settingId, setSettingId] = useState<string | null>(null);

  const defaultTemplate = `Olá {{nome}}! 👋

Este é um lembrete do seu agendamento na *Innovation Barbershop*:

📅 *Data:* {{data}}
🕐 *Horário:* {{hora}}
✂️ *Serviço:* {{servico}}
💈 *Barbeiro:* {{barbeiro}}

Contamos com sua presença!

Se precisar reagendar, entre em contato conosco.`;

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "whatsapp_message_template")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setTemplate(data.value);
        setSettingId(data.id);
      } else {
        setTemplate(defaultTemplate);
      }
    } catch (error: any) {
      console.error("Error fetching template:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template.trim()) {
      toast.error("A mensagem não pode estar vazia");
      return;
    }

    setSaving(true);
    try {
      if (settingId) {
        // Atualizar template existente
        const { error } = await supabase
          .from("settings")
          .update({ value: template })
          .eq("id", settingId);

        if (error) throw error;
      } else {
        // Criar novo template
        const { data, error } = await supabase
          .from("settings")
          .insert({
            key: "whatsapp_message_template",
            value: template,
            description: "Template da mensagem de lembrete via WhatsApp. Use {{nome}}, {{data}}, {{hora}}, {{servico}}, {{barbeiro}} como variáveis.",
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setSettingId(data.id);
      }

      toast.success("Mensagem atualizada com sucesso!");
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error("Erro ao salvar mensagem");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTemplate(defaultTemplate);
    toast.success("Mensagem restaurada para o padrão");
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">Carregando configurações...</p>;
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Mensagem do WhatsApp
        </CardTitle>
        <CardDescription>
          Personalize a mensagem de lembrete enviada aos clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template">Template da Mensagem</Label>
          <Textarea
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={12}
            className="font-mono text-sm"
            placeholder="Digite a mensagem..."
          />
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-semibold">Variáveis disponíveis:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <code className="bg-background px-2 py-1 rounded">{"{{nome}}"}</code>
              <span className="text-muted-foreground">Nome do cliente</span>
              
              <code className="bg-background px-2 py-1 rounded">{"{{data}}"}</code>
              <span className="text-muted-foreground">Data do agendamento</span>
              
              <code className="bg-background px-2 py-1 rounded">{"{{hora}}"}</code>
              <span className="text-muted-foreground">Horário</span>
              
              <code className="bg-background px-2 py-1 rounded">{"{{servico}}"}</code>
              <span className="text-muted-foreground">Nome do serviço</span>
              
              <code className="bg-background px-2 py-1 rounded">{"{{barbeiro}}"}</code>
              <span className="text-muted-foreground">Nome do barbeiro</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="btn-futuristic flex-1"
          >
            {saving ? "Salvando..." : "Salvar Mensagem"}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
        </div>

        <div className="bg-muted/30 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Dica:</strong> Use negrito com *texto* e quebras de linha para melhor formatação no WhatsApp.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}