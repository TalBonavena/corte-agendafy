import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Calendar as CalendarIcon, Clock, Trash2, Ban } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BARBERS, TIME_SLOTS } from "@/lib/barbers";
import { Badge } from "@/components/ui/badge";

interface BarberBlock {
  id: string;
  barber: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  is_full_day: boolean;
  reason: string | null;
  created_at: string;
}

export default function BarberScheduleBlocks() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<BarberBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    barber: "",
    date: undefined as Date | undefined,
    is_full_day: false,
    start_time: "",
    end_time: "",
    reason: "",
  });

  useEffect(() => {
    fetchBlocks();
  }, []);

  useEffect(() => {
    // Configurar realtime para barber_blocks
    const channel = supabase
      .channel('barber-blocks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barber_blocks'
        },
        (payload) => {
          console.log('Barber block change detected:', payload);
          fetchBlocks();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from("barber_blocks")
        .select("*")
        .order("block_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar bloqueios");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.barber || !formData.date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!formData.is_full_day && (!formData.start_time || !formData.end_time)) {
      toast.error("Preencha os horários de início e fim");
      return;
    }

    try {
      const { error } = await supabase.from("barber_blocks").insert({
        barber: formData.barber,
        block_date: format(formData.date, "yyyy-MM-dd"),
        is_full_day: formData.is_full_day,
        start_time: formData.is_full_day ? null : formData.start_time,
        end_time: formData.is_full_day ? null : formData.end_time,
        reason: formData.reason || null,
      });

      if (error) throw error;

      toast.success("Bloqueio criado com sucesso!");
      setIsDialogOpen(false);
      setFormData({
        barber: "",
        date: undefined,
        is_full_day: false,
        start_time: "",
        end_time: "",
        reason: "",
      });
      fetchBlocks();
    } catch (error: any) {
      toast.error("Erro ao criar bloqueio");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("barber_blocks").delete().eq("id", id);

      if (error) throw error;

      toast.success("Bloqueio removido com sucesso!");
      setDeleteConfirmId(null);
      fetchBlocks();
    } catch (error: any) {
      toast.error("Erro ao remover bloqueio");
      console.error(error);
    }
  };

  const groupBlocksByBarber = () => {
    const grouped: { [key: string]: BarberBlock[] } = {};
    BARBERS.forEach((barber) => {
      grouped[barber] = blocks.filter((block) => block.barber === barber);
    });
    return grouped;
  };

  const groupedBlocks = groupBlocksByBarber();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <header className="border-b border-border glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/painel-gerente")}
              className="btn-futuristic"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Bloqueios de Horários</h1>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="btn-futuristic">
            <Plus className="mr-2 h-4 w-4" />
            Novo Bloqueio
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {BARBERS.map((barber) => (
              <Card key={barber} className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5" />
                    {barber}
                  </CardTitle>
                  <CardDescription>
                    {groupedBlocks[barber].length} bloqueio(s) ativo(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {groupedBlocks[barber].length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum bloqueio configurado
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {groupedBlocks[barber].map((block) => (
                        <div
                          key={block.id}
                          className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                <span className="font-semibold">
                                  {format(new Date(block.block_date), "dd 'de' MMMM 'de' yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                                {block.is_full_day && (
                                  <Badge variant="secondary" className="ml-2">
                                    Dia Inteiro
                                  </Badge>
                                )}
                              </div>
                              {!block.is_full_day && block.start_time && block.end_time && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {block.start_time} - {block.end_time}
                                  </span>
                                </div>
                              )}
                              {block.reason && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <strong>Motivo:</strong> {block.reason}
                                </p>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => setDeleteConfirmId(block.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dialog para criar novo bloqueio */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-panel max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Bloqueio de Horário</DialogTitle>
            <DialogDescription>
              Marque horários de folga ou indisponibilidade para um barbeiro
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="barber">Barbeiro</Label>
              <Select
                value={formData.barber}
                onValueChange={(value) => setFormData({ ...formData, barber: value })}
                required
              >
                <SelectTrigger id="barber">
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {BARBERS.map((barber) => (
                    <SelectItem key={barber} value={barber}>
                      {barber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? (
                      format(formData.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      "Selecione a data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass-panel">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="is_full_day" className="cursor-pointer">
                Bloquear dia inteiro
              </Label>
              <Switch
                id="is_full_day"
                checked={formData.is_full_day}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_full_day: checked, start_time: "", end_time: "" })
                }
              />
            </div>

            {!formData.is_full_day && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Início</Label>
                    <Select
                      value={formData.start_time}
                      onValueChange={(value) => setFormData({ ...formData, start_time: value })}
                    >
                      <SelectTrigger id="start_time">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Fim</Label>
                    <Select
                      value={formData.end_time}
                      onValueChange={(value) => setFormData({ ...formData, end_time: value })}
                    >
                      <SelectTrigger id="end_time">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.filter((slot) => !formData.start_time || slot > formData.start_time).map(
                          (slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Férias, Folga, Compromisso pessoal..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-futuristic">
                Criar Bloqueio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este bloqueio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
