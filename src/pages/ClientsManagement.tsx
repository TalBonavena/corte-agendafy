import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, User, Mail, Calendar, Clock, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Client {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Appointment {
  id: string;
  service: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  barber: string;
}

interface ClientWithStats extends Client {
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  pendingAppointments: number;
  appointments: Appointment[];
}

export default function ClientsManagement() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    try {
      // Fetch all profiles (clients)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .order("scheduled_date", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Merge data and calculate stats
      const clientsWithStats: ClientWithStats[] = (profilesData || []).map((profile) => {
        const clientAppointments = (appointmentsData || []).filter(
          (apt) => apt.client_id === profile.id
        );

        return {
          ...profile,
          totalAppointments: clientAppointments.length,
          completedAppointments: clientAppointments.filter((a) => a.status === "concluido").length,
          canceledAppointments: clientAppointments.filter((a) => a.status === "cancelado").length,
          pendingAppointments: clientAppointments.filter((a) => a.status === "agendado").length,
          appointments: clientAppointments,
        };
      });

      setClients(clientsWithStats);
      setFilteredClients(clientsWithStats);
    } catch (error: any) {
      toast.error("Erro ao carregar clientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado":
        return "bg-blue-500/20 text-blue-500";
      case "concluido":
        return "bg-green-500/20 text-green-500";
      case "cancelado":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-muted";
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/painel-gerente")}
              className="btn-futuristic"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Gerenciamento de Clientes</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Clientes */}
          <div className="lg:col-span-1">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                  {filteredClients.length} cliente(s) encontrado(s)
                </CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado
                  </p>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                            selectedClient?.id === client.id
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold truncate">{client.name}</h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {client.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-muted-foreground">
                              {client.totalAppointments} agendamento(s)
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {client.pendingAppointments} pendente(s)
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do Cliente */}
          <div className="lg:col-span-2">
            {!selectedClient ? (
              <Card className="glass-panel h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecione um cliente para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Informações do Cliente */}
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle>Informações do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Nome</p>
                          <p className="font-medium">{selectedClient.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedClient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cliente desde</p>
                          <p className="font-medium">
                            {format(new Date(selectedClient.created_at), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total de Atendimentos</p>
                          <p className="font-medium">{selectedClient.totalAppointments}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="glass-panel">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-500">
                          {selectedClient.completedAppointments}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Concluídos</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="glass-panel">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-500">
                          {selectedClient.pendingAppointments}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Pendentes</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="glass-panel">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-red-500">
                          {selectedClient.canceledAppointments}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Cancelados</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Histórico de Atendimentos */}
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle>Histórico de Atendimentos</CardTitle>
                    <CardDescription>
                      Todos os agendamentos de {selectedClient.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedClient.appointments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento encontrado
                      </p>
                    ) : (
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {selectedClient.appointments.map((appointment, index) => (
                            <div key={appointment.id}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">{appointment.service}</h4>
                                    <Badge className={getStatusColor(appointment.status)}>
                                      {getStatusText(appointment.status)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    <strong>Barbeiro:</strong> {appointment.barber}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(appointment.scheduled_date), "dd 'de' MMMM 'de' yyyy", {
                                        locale: ptBR,
                                      })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {appointment.scheduled_time}
                                    </span>
                                  </div>
                                  {appointment.notes && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      <strong>Observações:</strong> {appointment.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {index < selectedClient.appointments.length - 1 && (
                                <Separator className="my-4" />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
