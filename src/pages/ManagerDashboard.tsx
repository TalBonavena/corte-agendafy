import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Package, 
  LogOut,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  client_id: string;
  service: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  client_name?: string;
  client_email?: string;
}

export default function ManagerDashboard() {
  const { signOut, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
  });

  useEffect(() => {
    fetchAppointments();
    fetchStats();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <header className="border-b border-border glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Painel do Gerente</h1>
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
                          {appointment.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <strong>Observações:</strong> {appointment.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
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
                <CardDescription>Em breve: Lista de clientes cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Funcionalidade em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Produtos e Serviços</CardTitle>
                <CardDescription>Em breve: Gerenciamento de produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Funcionalidade em desenvolvimento
                </p>
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
    </div>
  );
}