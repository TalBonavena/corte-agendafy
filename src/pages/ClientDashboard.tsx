import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar as CalendarIcon, LogOut, Clock, User, Mail, XCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SERVICES, formatServiceDisplay } from "@/lib/services";
import { BARBERS, TIME_SLOTS } from "@/lib/barbers";
import { z } from "zod";
import logo from "@/assets/logo.jpeg";

// Validation schema for appointment creation
const appointmentSchema = z.object({
  service: z.string().trim().min(1, "Selecione um serviço").max(100, "Nome do serviço muito longo"),
  barber: z.string().trim().min(1, "Selecione um barbeiro"),
  date: z.date({ required_error: "Selecione uma data" }),
  time: z.string().trim().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Horário inválido"),
  notes: z.string().trim().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
});

interface Appointment {
  id: string;
  service: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  barber: string;
}

interface Profile {
  name: string;
  email: string;
}

export default function ClientDashboard() {
  const { signOut, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAppointment, setNewAppointment] = useState({
    service: "",
    barber: "",
    date: undefined as Date | undefined,
    time: "",
    notes: "",
  });
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  
  // Ref para armazenar valores atuais para os callbacks realtime
  const appointmentRef = useRef(newAppointment);

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
  }, [user]);

  useEffect(() => {
    // Atualizar ref com valores atuais
    appointmentRef.current = newAppointment;
    
    if (newAppointment.barber && newAppointment.date) {
      fetchAvailableSlots();
    }
  }, [newAppointment.barber, newAppointment.date]);

  useEffect(() => {
    // Configurar realtime para appointments
    const appointmentsChannel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('🔄 Appointment change detected:', payload);
          fetchAppointments();
          // Usar ref para ter valores atualizados
          if (appointmentRef.current.barber && appointmentRef.current.date) {
            fetchAvailableSlots();
          }
        }
      )
      .subscribe();

    // Configurar realtime para barber_blocks
    const blocksChannel = supabase
      .channel('blocks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barber_blocks'
        },
        (payload) => {
          console.log('🔄 Block change detected:', payload);
          // Usar ref para ter valores atualizados
          if (appointmentRef.current.barber && appointmentRef.current.date) {
            fetchAvailableSlots();
          }
        }
      )
      .subscribe();

    // Cleanup ao desmontar componente
    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(blocksChannel);
    };
  }, []);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Erro ao carregar perfil");
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("client_id", user.id)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!newAppointment.barber || !newAppointment.date) return;

    try {
      const dateStr = format(newAppointment.date, "yyyy-MM-dd");
      
      // Buscar agendamentos existentes para o barbeiro e data selecionados
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("scheduled_time")
        .eq("barber", newAppointment.barber)
        .eq("scheduled_date", dateStr)
        .neq("status", "cancelado");

      if (appointmentsError) throw appointmentsError;

      // Buscar bloqueios para o barbeiro e data selecionados
      const { data: blocks, error: blocksError } = await supabase
        .from("barber_blocks")
        .select("*")
        .eq("barber", newAppointment.barber)
        .eq("block_date", dateStr);

      if (blocksError) throw blocksError;

      // Criar set com horários ocupados por agendamentos (normalizar formato HH:MM:SS para HH:MM)
      const occupiedByAppointments = new Set(
        appointments?.map((apt) => apt.scheduled_time.substring(0, 5)) || []
      );

      // Adicionar horários bloqueados
      const occupiedByBlocks = new Set<string>();
      blocks?.forEach((block) => {
        if (block.is_full_day) {
          // Se o dia inteiro está bloqueado, marcar todos os horários como ocupados
          TIME_SLOTS.forEach((slot) => occupiedByBlocks.add(slot));
        } else if (block.start_time && block.end_time) {
          // Bloquear horários entre start_time e end_time (normalizar formato)
          const startTime = block.start_time.substring(0, 5);
          const endTime = block.end_time.substring(0, 5);
          TIME_SLOTS.forEach((slot) => {
            if (slot >= startTime && slot <= endTime) {
              occupiedByBlocks.add(slot);
            }
          });
        }
      });

      // Combinar todos os horários ocupados
      const allOccupied = new Set([...occupiedByAppointments, ...occupiedByBlocks]);
      setBookedSlots(allOccupied);

      // Filtrar horários disponíveis
      const available = TIME_SLOTS.filter((slot) => !allOccupied.has(slot));
      setAvailableSlots(available);
    } catch (error: any) {
      toast.error("Erro ao carregar horários disponíveis");
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    // Validate appointment data with Zod schema
    try {
      const validatedData = appointmentSchema.parse({
        service: newAppointment.service,
        barber: newAppointment.barber,
        date: newAppointment.date,
        time: newAppointment.time,
        notes: newAppointment.notes,
      });

      // Insert validated data
      const { error } = await supabase.from("appointments").insert({
        client_id: user.id,
        service: validatedData.service,
        barber: validatedData.barber,
        scheduled_date: format(validatedData.date, "yyyy-MM-dd"),
        scheduled_time: validatedData.time,
        notes: validatedData.notes || null,
      });

      if (error) throw error;

      toast.success("Agendamento realizado com sucesso!");
      setNewAppointment({ service: "", barber: "", date: undefined, time: "", notes: "" });
      setAvailableSlots([]);
      fetchAppointments();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Display first validation error
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error("Erro ao criar agendamento");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado":
        return "text-blue-500";
      case "concluido":
        return "text-green-500";
      case "cancelado":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "agendado":
        return "Aguardando confirmação";
      case "concluido":
        return "Concluído";
      case "cancelado":
        return "Cancelado";
      default:
        return status;
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelado" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Agendamento cancelado com sucesso!");
      setCancelConfirmId(null);
      fetchAppointments();
    } catch (error: any) {
      toast.error("Erro ao cancelar agendamento");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <header className="border-b border-border glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src={logo} 
              alt="Logo Barbearia Master" 
              className="w-12 h-12 object-contain pulse-glow border-2 border-white rounded-xl p-2 bg-gradient-to-br from-background/10 to-background/5 backdrop-blur-sm" 
            />
            <h1 className="text-2xl font-bold">Meu Painel</h1>
          </div>
          <Button variant="outline" onClick={signOut} className="btn-futuristic">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 max-w-md">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Meu Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Novo Agendamento</CardTitle>
              <CardDescription>Agende seu próximo atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Serviço</Label>
                  <Select
                    value={newAppointment.service}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, service: value })}
                    required
                  >
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((service) => (
                        <SelectItem key={service.name} value={service.name}>
                          {formatServiceDisplay(service)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barber">Barbeiro</Label>
                  <Select
                    value={newAppointment.barber}
                    onValueChange={(value) => {
                      setNewAppointment({ ...newAppointment, barber: value, time: "" });
                      setAvailableSlots([]);
                    }}
                    required
                  >
                    <SelectTrigger id="barber">
                      <SelectValue placeholder="Selecione um barbeiro" />
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
                          !newAppointment.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newAppointment.date ? (
                          format(newAppointment.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        ) : (
                          "Selecione a data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass-panel">
                      <Calendar
                        mode="single"
                        selected={newAppointment.date}
                        onSelect={(date) => {
                          setNewAppointment({ ...newAppointment, date, time: "" });
                          setAvailableSlots([]);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Horário</Label>
                  {!newAppointment.barber || !newAppointment.date ? (
                    <p className="text-sm text-muted-foreground">
                      Selecione um barbeiro e uma data primeiro
                    </p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-red-500">
                      Sem horários disponíveis para esta data
                    </p>
                  ) : (
                    <Select
                      value={newAppointment.time}
                      onValueChange={(value) => setNewAppointment({ ...newAppointment, time: value })}
                      required
                    >
                      <SelectTrigger id="time">
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Alguma observação especial?"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full btn-futuristic">
                  Confirmar Agendamento
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Meus Agendamentos</CardTitle>
              <CardDescription>Histórico de atendimentos</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Carregando...</p>
              ) : appointments.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum agendamento encontrado</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{appointment.service}</h3>
                        <span className={cn("text-sm font-medium", getStatusColor(appointment.status))}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Barbeiro:</strong> {appointment.barber}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(appointment.scheduled_date), "dd/MM/yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {appointment.scheduled_time}
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground mb-3">{appointment.notes}</p>
                      )}
                      {appointment.status === "agendado" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setCancelConfirmId(appointment.id)}
                          className="w-full"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar Agendamento
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={!!cancelConfirmId} onOpenChange={(open) => !open && setCancelConfirmId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter agendamento</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelConfirmId && handleCancelAppointment(cancelConfirmId)}>
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}