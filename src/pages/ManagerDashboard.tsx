import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Package, 
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Ban
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SERVICES, formatServiceDisplay } from "@/lib/services";
import { BARBERS, TIME_SLOTS } from "@/lib/barbers";
import logo from "@/assets/logo.jpeg";

interface Appointment {
  id: string;
  client_id: string;
  service: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  barber: string;
  client_name?: string;
  client_email?: string;
}

export default function ManagerDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
  });
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    service: "",
    barber: "",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
  });

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, []);

  useEffect(() => {
    // Configurar realtime para appointments - atualizar quando houver mudanças
    const channel = supabase
      .channel('manager-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Appointment change detected in manager panel:', payload);
          fetchAppointments();
          fetchStats();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email");

      if (profilesError) throw profilesError;

      // Merge data
      const appointmentsWithProfiles = appointmentsData?.map((appointment) => {
        const profile = profilesData?.find((p) => p.id === appointment.client_id);
        return {
          ...appointment,
          client_name: profile?.name || "Desconhecido",
          client_email: profile?.email || "",
        };
      }) || [];

      setAppointments(appointmentsWithProfiles);
    } catch (error: any) {
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true });

      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today);

      const { count: pendingCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "agendado");

      setStats({
        totalAppointments: total || 0,
        todayAppointments: todayCount || 0,
        pendingAppointments: pendingCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success("Status atualizado com sucesso!");
      fetchAppointments();
      fetchStats();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleEditClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditForm({
      service: appointment.service,
      barber: appointment.barber,
      scheduled_date: appointment.scheduled_date,
      scheduled_time: appointment.scheduled_time,
      notes: appointment.notes || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingAppointment) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          service: editForm.service,
          barber: editForm.barber,
          scheduled_date: editForm.scheduled_date,
          scheduled_time: editForm.scheduled_time,
          notes: editForm.notes,
        })
        .eq("id", editingAppointment.id);

      if (error) throw error;

      toast.success("Agendamento atualizado com sucesso!");
      setEditingAppointment(null);
      fetchAppointments();
      fetchStats();
    } catch (error: any) {
      toast.error("Erro ao atualizar agendamento");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Agendamento excluído com sucesso!");
      setDeleteConfirmId(null);
      fetchAppointments();
      fetchStats();
    } catch (error: any) {
      toast.error("Erro ao excluir agendamento");
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
            <h1 className="text-2xl font-bold">Painel do Gerente</h1>
          </div>
          <Button variant="outline" onClick={signOut} className="btn-futuristic">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass-panel">
            <TabsTrigger value="appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="billing">
              <DollarSign className="mr-2 h-4 w-4" />
              Faturamento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Gerenciar Agendamentos</CardTitle>
                <CardDescription>Visualize e gerencie todos os agendamentos</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground">Carregando...</p>
                ) : appointments.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nenhum agendamento encontrado</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{appointment.client_name}</h3>
                            <p className="text-sm text-muted-foreground">{appointment.client_email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {format(new Date(appointment.scheduled_date), "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                            <p className="text-sm text-muted-foreground">{appointment.scheduled_time}</p>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm"><strong>Serviço:</strong> {appointment.service}</p>
                          <p className="text-sm"><strong>Barbeiro:</strong> {appointment.barber}</p>
                          {appointment.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Observações:</strong> {appointment.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={appointment.status === "agendado" ? "default" : "outline"}
                            onClick={() => updateAppointmentStatus(appointment.id, "agendado")}
                            className="btn-futuristic"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            Agendado
                          </Button>
                          <Button
                            size="sm"
                            variant={appointment.status === "concluido" ? "default" : "outline"}
                            onClick={() => updateAppointmentStatus(appointment.id, "concluido")}
                            className="btn-futuristic"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Concluído
                          </Button>
                          <Button
                            size="sm"
                            variant={appointment.status === "cancelado" ? "destructive" : "outline"}
                            onClick={() => updateAppointmentStatus(appointment.id, "cancelado")}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(appointment)}
                            className="btn-futuristic"
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(appointment.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Gerencie os clientes cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Visualize o histórico completo de atendimentos e informações de contato dos clientes
                  </p>
                  <Button onClick={() => navigate("/gerenciar-clientes")} className="btn-futuristic">
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Clientes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Serviços e Horários</CardTitle>
                <CardDescription>Gerencie os serviços e bloqueios de horários</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center py-8 border border-border rounded-lg bg-card/50">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Serviços disponíveis já configurados
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {SERVICES.length} serviços cadastrados
                    </p>
                  </div>
                  <div className="text-center py-8 border border-border rounded-lg bg-card/50">
                    <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Configure bloqueios de horários e folgas dos barbeiros
                    </p>
                    <Button onClick={() => navigate("/bloqueios-horarios")} className="btn-futuristic">
                      <Ban className="mr-2 h-4 w-4" />
                      Gerenciar Bloqueios
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Faturamento</CardTitle>
                <CardDescription>Em breve: Relatórios financeiros</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Funcionalidade em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingAppointment} onOpenChange={(open) => !open && setEditingAppointment(null)}>
        <DialogContent className="glass-panel">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Modifique os detalhes do agendamento de {editingAppointment?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service">Serviço</Label>
              <Select
                value={editForm.service}
                onValueChange={(value) => setEditForm({ ...editForm, service: value })}
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
                value={editForm.barber}
                onValueChange={(value) => setEditForm({ ...editForm, barber: value })}
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
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={editForm.scheduled_date}
                onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Select
                value={editForm.scheduled_time}
                onValueChange={(value) => setEditForm({ ...editForm, scheduled_time: value })}
              >
                <SelectTrigger id="time">
                  <SelectValue placeholder="Selecione um horário" />
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
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAppointment(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} className="btn-futuristic">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}