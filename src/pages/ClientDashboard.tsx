import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, LogOut, Clock, User, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  service: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
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
    date: undefined as Date | undefined,
    time: "",
    notes: "",
  });

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
  }, [user]);

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

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !newAppointment.date) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { error } = await supabase.from("appointments").insert({
        client_id: user.id,
        service: newAppointment.service,
        scheduled_date: format(newAppointment.date, "yyyy-MM-dd"),
        scheduled_time: newAppointment.time,
        notes: newAppointment.notes || null,
      });

      if (error) throw error;

      toast.success("Agendamento realizado com sucesso!");
      setNewAppointment({ service: "", date: undefined, time: "", notes: "" });
      fetchAppointments();
    } catch (error: any) {
      toast.error("Erro ao criar agendamento");
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
        return "Agendado";
      case "concluido":
        return "Concluído";
      case "cancelado":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <header className="border-b border-border glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Meu Painel</h1>
          <Button variant="outline" onClick={signOut} className="btn-futuristic">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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

          <Card className="glass-panel lg:col-span-2">
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-card/50">
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-card/50">
                <p className="text-2xl font-bold">
                  {appointments.filter((a) => a.status === "agendado").length}
                </p>
                <p className="text-sm text-muted-foreground">Próximos Agendamentos</p>
              </div>
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
                  <Input
                    id="service"
                    placeholder="Ex: Corte + Barba"
                    value={newAppointment.service}
                    onChange={(e) => setNewAppointment({ ...newAppointment, service: e.target.value })}
                    required
                  />
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
                        onSelect={(date) => setNewAppointment({ ...newAppointment, date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                    required
                  />
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                        <p className="text-sm text-muted-foreground mt-2">{appointment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}