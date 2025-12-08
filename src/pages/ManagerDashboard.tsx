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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  Ban,
  MessageCircle,
  Settings,
  Menu,
  Crown,
  Wallet
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SERVICES, formatServiceDisplay, getServicePrice } from "@/lib/services";
import { BARBERS, TIME_SLOTS } from "@/lib/barbers";
import logo from "@/assets/logo.jpeg";
import ProductsManagement from "@/components/ProductsManagement";
import BillingReport from "@/components/BillingReport";
import ProductSale from "@/components/ProductSale";
import WhatsAppSettings from "@/components/WhatsAppSettings";
import CashClosing from "@/components/CashClosing";
import ClientInsights from "@/components/ClientInsights";

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
  client_phone?: string | null;
}

interface Subscriber {
  id: string;
  client_id: string;
  plan_name: string;
  price: number;
  cuts_per_week: number;
  is_active: boolean;
  subscribed_at: string;
  expires_at: string | null;
  client_name?: string;
  client_email?: string;
  client_phone?: string | null;
}

export default function ManagerDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
  });
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cancelSubscriptionId, setCancelSubscriptionId] = useState<string | null>(null);
  const [reactivateSubscriptionId, setReactivateSubscriptionId] = useState<string | null>(null);
  const [deleteSubscriptionId, setDeleteSubscriptionId] = useState<string | null>(null);
  const [expiredSubscribers, setExpiredSubscribers] = useState<Subscriber[]>([]);
  const [activeTab, setActiveTab] = useState("appointments");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    service: "",
    barber: "",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
  });

  const menuItems = [
    { value: "appointments", label: "Agendamentos", icon: Calendar },
    { value: "clients", label: "Clientes", icon: Users },
    { value: "subscribers", label: "Assinantes", icon: Crown },
    { value: "products", label: "Produtos", icon: Package },
    { value: "billing", label: "Faturamento", icon: DollarSign },
    { value: "cashclosing", label: "Caixa", icon: Wallet },
    { value: "settings", label: "Msg do WhatsApp", icon: Settings },
  ];

  useEffect(() => {
    fetchAppointments();
    fetchStats();
    fetchSubscribers();
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
      // Fetch appointments (excluding canceled and completed)
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("status", "agendado")
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, phone");

      if (profilesError) throw profilesError;

      // Merge data
      const appointmentsWithProfiles = appointmentsData?.map((appointment) => {
        const profile = profilesData?.find((p) => p.id === appointment.client_id);
        return {
          ...appointment,
          client_name: profile?.name || "Desconhecido",
          client_email: profile?.email || "",
          client_phone: profile?.phone || null,
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
        .select("*", { count: "exact", head: true })
        .neq("status", "cancelado");

      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today)
        .neq("status", "cancelado");

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

  const fetchSubscribers = async () => {
    try {
      // Fetch all subscriptions (active and inactive)
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, phone");

      if (profilesError) throw profilesError;

      // Merge data with profiles
      const allSubscribersWithProfiles = subscriptionsData?.map((sub) => {
        const profile = profilesData?.find((p) => p.id === sub.client_id);
        return {
          ...sub,
          client_name: profile?.name || "Desconhecido",
          client_email: profile?.email || "",
          client_phone: profile?.phone || null,
        };
      }) || [];

      // Separar ativos e expirados/inativos
      const active = allSubscribersWithProfiles.filter((sub) => sub.is_active);
      const expired = allSubscribersWithProfiles.filter((sub) => !sub.is_active);

      setSubscribers(active);
      setExpiredSubscribers(expired);
    } catch (error: any) {
      console.error("Erro ao carregar assinantes:", error);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ is_active: false })
        .eq("id", subscriptionId);

      if (error) throw error;

      toast.success("Assinatura cancelada com sucesso");
      fetchSubscribers();
    } catch (error: any) {
      console.error("Erro ao cancelar assinatura:", error);
      toast.error("Erro ao cancelar assinatura");
    } finally {
      setCancelSubscriptionId(null);
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    try {
      // Definir nova expiração para o fim do mês atual
      const expiresAt = endOfMonth(new Date());

      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          is_active: true,
          expires_at: format(expiresAt, "yyyy-MM-dd'T'23:59:59"),
          subscribed_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);

      if (error) throw error;

      toast.success("Assinatura reativada com sucesso");
      fetchSubscribers();
    } catch (error: any) {
      console.error("Erro ao reativar assinatura:", error);
      toast.error("Erro ao reativar assinatura");
    } finally {
      setReactivateSubscriptionId(null);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", subscriptionId);

      if (error) throw error;

      toast.success("Assinatura excluída com sucesso");
      fetchSubscribers();
    } catch (error: any) {
      console.error("Erro ao excluir assinatura:", error);
      toast.error("Erro ao excluir assinatura");
    } finally {
      setDeleteSubscriptionId(null);
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

  const handleSendWhatsAppReminder = async (appointment: Appointment) => {
    if (!appointment.client_phone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }

    // Remover formatação do telefone (deixar apenas números)
    const phoneNumber = appointment.client_phone.replace(/\D/g, "");
    
    // Validar se tem 11 dígitos (DDD + número)
    if (phoneNumber.length !== 11) {
      toast.error("Telefone inválido");
      return;
    }

    try {
      // Buscar template personalizado
      const { data: settingData, error: settingError } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "whatsapp_message_template")
        .single();

      if (settingError && settingError.code !== "PGRST116") {
        console.error("Error fetching template:", settingError);
      }

      // Template padrão caso não exista no banco
      const defaultTemplate = `Olá {{nome}}! 👋

Este é um lembrete do seu agendamento na *Innovation Barbershop*:

📅 *Data:* {{data}}
🕐 *Horário:* {{hora}}
✂️ *Serviço:* {{servico}}
💈 *Barbeiro:* {{barbeiro}}

Contamos com sua presença!

Se precisar reagendar, entre em contato conosco.`;

      const template = settingData?.value || defaultTemplate;

      // Formatar a data e hora
      const dataFormatada = format(new Date(appointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR });
      const horaFormatada = appointment.scheduled_time.substring(0, 5);

      // Substituir variáveis no template
      const mensagem = template
        .replace(/\{\{nome\}\}/g, appointment.client_name || "Cliente")
        .replace(/\{\{data\}\}/g, dataFormatada)
        .replace(/\{\{hora\}\}/g, horaFormatada)
        .replace(/\{\{servico\}\}/g, appointment.service)
        .replace(/\{\{barbeiro\}\}/g, appointment.barber);

      // Codificar a mensagem para URL
      const mensagemCodificada = encodeURIComponent(mensagem);

      // Detectar se é mobile ou desktop
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // URL do WhatsApp (com código do país +55 para Brasil)
      const whatsappUrl = isMobile
        ? `https://wa.me/55${phoneNumber}?text=${mensagemCodificada}`
        : `https://web.whatsapp.com/send?phone=55${phoneNumber}&text=${mensagemCodificada}`;

      // Abrir WhatsApp em nova aba
      window.open(whatsappUrl, "_blank");
      
      toast.success("Abrindo WhatsApp...");
    } catch (error) {
      console.error("Error sending WhatsApp reminder:", error);
      toast.error("Erro ao preparar mensagem");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 glass-panel">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-3">
              <img 
                src={logo} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-lg border-2 border-white p-1" 
              />
              <span>Painel Admin</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setActiveTab(item.value);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.value 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <header className="border-b border-border glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <img 
              src={logo} 
              alt="Logo Barbearia Master" 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain pulse-glow border-2 border-white rounded-xl p-1.5 sm:p-2 bg-gradient-to-br from-background/10 to-background/5 backdrop-blur-sm" 
            />
            <h1 className="text-lg sm:text-2xl font-bold">Painel Admin</h1>
          </div>
          <Button variant="outline" onClick={signOut} className="btn-futuristic text-xs sm:text-sm px-2 sm:px-4">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-8">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalAppointments}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Hoje</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.todayAppointments}</div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Pendentes</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.pendingAppointments}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="hidden md:grid w-full grid-cols-7 glass-panel h-auto p-1">
            <TabsTrigger value="appointments" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendamentos</span>
              <span className="sm:hidden">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
              <Users className="h-4 w-4" />
              <span>Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="hidden sm:inline">Assinantes</span>
              <span className="sm:hidden">Plano</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos</span>
              <span className="sm:hidden">Prod.</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Faturamento</span>
              <span className="sm:hidden">Fatur.</span>
            </TabsTrigger>
            <TabsTrigger value="cashclosing" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Caixa</span>
              <span className="sm:hidden">Caixa</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-[10px] sm:text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Msg do WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
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
                  <div className="space-y-3 sm:space-y-4">
                    {appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-3 sm:p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 flex-1 mr-2">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{appointment.client_name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{appointment.client_email}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs sm:text-sm font-medium">
                              {format(new Date(appointment.scheduled_date), "dd/MM", { locale: ptBR })}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{appointment.scheduled_time.substring(0, 5)}</p>
                          </div>
                        </div>
                        
                        <div className="mb-2 sm:mb-3 space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <p className="text-xs sm:text-sm"><strong>Serviço:</strong> {appointment.service}</p>
                            <p className="text-xs sm:text-sm font-semibold text-primary">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(getServicePrice(appointment.service))}
                            </p>
                          </div>
                          <p className="text-xs sm:text-sm"><strong>Barbeiro:</strong> {appointment.barber}</p>
                          {appointment.notes && (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              <strong>Obs:</strong> {appointment.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          <Button
                            size="sm"
                            variant={appointment.status === "concluido" ? "default" : "outline"}
                            onClick={() => updateAppointmentStatus(appointment.id, "concluido")}
                            className="btn-futuristic h-7 sm:h-8 text-xs px-2 sm:px-3"
                          >
                            <CheckCircle className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Concluído</span>
                          </Button>
                          <Button
                            size="sm"
                            variant={appointment.status === "cancelado" ? "destructive" : "outline"}
                            onClick={() => updateAppointmentStatus(appointment.id, "cancelado")}
                            className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                          >
                            <XCircle className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Cancelar</span>
                          </Button>
                          {appointment.client_phone && appointment.status === "agendado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendWhatsAppReminder(appointment)}
                              className="btn-futuristic bg-green-500/10 hover:bg-green-500/20 border-green-500/30 h-7 sm:h-8 text-xs px-2 sm:px-3"
                            >
                              <MessageCircle className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(appointment)}
                            className="btn-futuristic h-7 sm:h-8 text-xs px-2 sm:px-3"
                          >
                            <Edit className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(appointment.id)}
                            className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                          >
                            <Trash2 className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Excluir</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            {/* Client Insights */}
            <ClientInsights />

            {/* Link to full management */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Gerenciamento Completo</CardTitle>
                <CardDescription>Acesse o painel completo de gestão de clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
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

          <TabsContent value="subscribers" className="space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Assinantes do Plano Cabelo Semanal
                </CardTitle>
                <CardDescription>
                  Clientes com plano de R$ 80,00/mês - 1 corte por semana garantido
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscribers.length === 0 && expiredSubscribers.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum assinante no momento</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Assinantes Ativos */}
                    {subscribers.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-muted-foreground">
                            Assinantes ativos: <strong>{subscribers.length}</strong>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Receita mensal: <strong>R$ {(subscribers.length * 80).toFixed(2).replace(".", ",")}</strong>
                          </span>
                        </div>
                        {subscribers.map((subscriber) => (
                          <div
                            key={subscriber.id}
                            className="p-4 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{subscriber.client_name}</h3>
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                </div>
                                <p className="text-sm text-muted-foreground">{subscriber.client_email}</p>
                                {subscriber.client_phone && (
                                  <p className="text-sm text-muted-foreground">{subscriber.client_phone}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium text-green-500">
                                  R$ {subscriber.price.toFixed(2).replace(".", ",")}/mês
                                </span>
                                {subscriber.expires_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Expira: {format(new Date(subscriber.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>{subscriber.cuts_per_week} corte(s) por semana</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCancelSubscriptionId(subscriber.id)}
                                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Assinaturas Expiradas/Inativas */}
                    {expiredSubscribers.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground border-t border-border pt-4">
                          Assinaturas Expiradas ({expiredSubscribers.length})
                        </h3>
                        {expiredSubscribers.map((subscriber) => (
                          <div
                            key={subscriber.id}
                            className="p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-muted-foreground">{subscriber.client_name}</h3>
                                  <Crown className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">{subscriber.client_email}</p>
                                {subscriber.client_phone && (
                                  <p className="text-sm text-muted-foreground">{subscriber.client_phone}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Expirado
                                </span>
                                {subscriber.expires_at && (
                                  <p className="text-xs text-destructive">
                                    Expirou em: {format(new Date(subscriber.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteSubscriptionId(subscriber.id)}
                                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setReactivateSubscriptionId(subscriber.id)}
                                className="h-7 text-xs"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reativar Plano
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Gestão de Produtos</CardTitle>
                <CardDescription>Cadastre e gerencie os produtos vendidos na barbearia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-end">
                  <ProductSale />
                </div>
                <ProductsManagement />
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Bloqueios de Horários</CardTitle>
                <CardDescription>Configure folgas e indisponibilidades dos barbeiros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Configure bloqueios de horários e folgas dos barbeiros
                  </p>
                  <Button onClick={() => navigate("/bloqueios-horarios")} className="btn-futuristic">
                    <Ban className="mr-2 h-4 w-4" />
                    Gerenciar Bloqueios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <BillingReport />
          </TabsContent>

          <TabsContent value="cashclosing">
            <CashClosing />
          </TabsContent>

          <TabsContent value="settings">
            <WhatsAppSettings />
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

      <AlertDialog open={!!cancelSubscriptionId} onOpenChange={(open) => !open && setCancelSubscriptionId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta assinatura? O cliente perderá acesso aos benefícios do plano semanal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscriptionId && handleCancelSubscription(cancelSubscriptionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!reactivateSubscriptionId} onOpenChange={(open) => !open && setReactivateSubscriptionId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reativar esta assinatura? O plano será renovado até o final deste mês e o cliente terá acesso aos benefícios novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reactivateSubscriptionId && handleReactivateSubscription(reactivateSubscriptionId)}
              className="btn-futuristic"
            >
              Reativar Assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSubscriptionId} onOpenChange={(open) => !open && setDeleteSubscriptionId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente esta assinatura? O cliente poderá criar uma nova assinatura depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubscriptionId && handleDeleteSubscription(deleteSubscriptionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}