import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Calendar, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientInsight {
  id: string;
  name: string;
  email: string;
  totalAppointments: number;
  lastAppointmentDate: string | null;
  daysSinceLastVisit: number | null;
}

export default function ClientInsights() {
  const [topClients, setTopClients] = useState<ClientInsight[]>([]);
  const [inactiveClients, setInactiveClients] = useState<ClientInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientInsights();
  }, []);

  const fetchClientInsights = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email");

      if (profilesError) throw profilesError;

      // Fetch all appointments (excluding canceled)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("client_id, scheduled_date, status")
        .neq("status", "cancelado")
        .order("scheduled_date", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      const today = new Date();

      // Calculate insights for each client
      const clientsWithInsights: ClientInsight[] = (profilesData || []).map((profile) => {
        const clientAppointments = (appointmentsData || []).filter(
          (apt) => apt.client_id === profile.id
        );

        // Find the most recent completed or past appointment
        const pastAppointments = clientAppointments.filter(
          (apt) => new Date(apt.scheduled_date) <= today
        );

        const lastAppointment = pastAppointments.length > 0 
          ? pastAppointments.sort((a, b) => 
              new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
            )[0]
          : null;

        const daysSinceLastVisit = lastAppointment 
          ? differenceInDays(today, new Date(lastAppointment.scheduled_date))
          : null;

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          totalAppointments: clientAppointments.length,
          lastAppointmentDate: lastAppointment?.scheduled_date || null,
          daysSinceLastVisit,
        };
      });

      // Top 5 clients with most appointments
      const sortedByAppointments = [...clientsWithInsights]
        .filter((c) => c.totalAppointments > 0)
        .sort((a, b) => b.totalAppointments - a.totalAppointments)
        .slice(0, 5);

      // Clients inactive for more than 30 days (who have at least 1 past appointment)
      const inactive = [...clientsWithInsights]
        .filter((c) => c.daysSinceLastVisit !== null && c.daysSinceLastVisit > 30)
        .sort((a, b) => (b.daysSinceLastVisit || 0) - (a.daysSinceLastVisit || 0))
        .slice(0, 5);

      setTopClients(sortedByAppointments);
      setInactiveClients(inactive);
    } catch (error) {
      console.error("Error fetching client insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Clients */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Clientes Mais Frequentes
          </CardTitle>
          <CardDescription className="text-xs">
            Top 5 clientes que mais agendaram
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum cliente com agendamentos ainda
            </p>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-yellow-500 text-yellow-950" :
                      index === 1 ? "bg-gray-400 text-gray-900" :
                      index === 2 ? "bg-amber-600 text-amber-950" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[150px]">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {client.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {client.totalAppointments} visitas
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Clients */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Clientes Inativos
          </CardTitle>
          <CardDescription className="text-xs">
            Clientes há mais de 30 dias sem agendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inactiveClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum cliente inativo no momento
            </p>
          ) : (
            <div className="space-y-3">
              {inactiveClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[150px]">{client.name}</p>
                      {client.lastAppointmentDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Última visita: {format(new Date(client.lastAppointmentDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                    {client.daysSinceLastVisit} dias
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
