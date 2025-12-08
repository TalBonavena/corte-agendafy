import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, LogOut, Clock, User, Mail, XCircle, Phone, Edit, Crown, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TIME_SLOTS } from "@/lib/barbers";
import { z } from "zod";
import logo from "@/assets/logo.jpeg";
import ServiceSelector from "@/components/ServiceSelector";
import BarberSelector from "@/components/BarberSelector";

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
  phone: string | null;
}

interface Subscription {
  id: string;
  plan_name: string;
  price: number;
  cuts_per_week: number;
  is_active: boolean;
  subscribed_at: string;
  expires_at: string | null;
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  phone: z.string()
    .trim()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (99) 99999-9999")
    .optional()
    .or(z.literal("")),
});

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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  // Ref para armazenar valores atuais para os callbacks realtime
  const appointmentRef = useRef(newAppointment);

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
    fetchSubscription();
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
        .select("name, email, phone")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setProfileForm({
        name: data.name || "",
        phone: data.phone || "",
      });
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
        .neq("status", "cancelado")
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

  const fetchSubscription = async () => {
    if (!user) return;
    
    try {
      // Buscar assinatura ativa e não expirada
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      // Verificar se expirou
      if (data && data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          // Expirou - desativar automaticamente
          await supabase
            .from("subscriptions")
            .update({ is_active: false })
            .eq("id", data.id);
          setSubscription(null);
          return;
        }
      }
      
      setSubscription(data);
    } catch (error: any) {
      console.error("Erro ao carregar assinatura:", error);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    
    try {
      // Verificar se já tem uma assinatura inativa (expirada)
      const { data: existingSubscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("client_id", user.id)
        .eq("is_active", false)
        .maybeSingle();
      
      if (existingSubscription) {
        toast.error("Seu plano expirou. Entre em contato com o gerente para reativar.");
        setIsSubscribeDialogOpen(false);
        return;
      }

      // Definir expiração para o fim do mês atual
      const expiresAt = endOfMonth(new Date());

      const { error } = await supabase
        .from("subscriptions")
        .insert({
          client_id: user.id,
          plan_name: "Plano Cabelo Semanal",
          price: 80.00,
          cuts_per_week: 1,
          expires_at: format(expiresAt, "yyyy-MM-dd'T'23:59:59"),
        });

      if (error) throw error;

      toast.success("Plano ativado com sucesso! Seu calendário agora mostra visualização semanal.");
      setIsSubscribeDialogOpen(false);
      fetchSubscription();
    } catch (error: any) {
      toast.error("Erro ao ativar plano");
      console.error(error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;
    
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ is_active: false })
        .eq("id", subscription.id);

      if (error) throw error;

      toast.success("Plano cancelado com sucesso.");
      setSubscription(null);
    } catch (error: any) {
      toast.error("Erro ao cancelar plano");
    }
  };

  // Gera os dias da semana atual para o calendário semanal
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

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
      // Assinantes só podem agendar "Corte"
      const serviceToUse = subscription ? "Corte" : newAppointment.service;
      
      const validatedData = appointmentSchema.parse({
        service: serviceToUse,
        barber: newAppointment.barber,
        date: newAppointment.date,
        time: newAppointment.time,
        notes: newAppointment.notes,
      });

      // Se for assinante, verificar se já tem corte na semana
      if (subscription) {
        const selectedDate = validatedData.date;
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

        // Buscar agendamentos do assinante na semana selecionada
        const { data: weekAppointments, error: weekError } = await supabase
          .from("appointments")
          .select("id")
          .eq("client_id", user.id)
          .neq("status", "cancelado")
          .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
          .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"));

        if (weekError) throw weekError;

        if (weekAppointments && weekAppointments.length >= subscription.cuts_per_week) {
          toast.error(`Você já tem ${subscription.cuts_per_week} corte(s) agendado(s) para esta semana. Seu plano permite apenas ${subscription.cuts_per_week} corte(s) por semana.`);
          return;
        }
      }

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
      
      // Abrir WhatsApp com mensagem personalizada
      const dataFormatada = format(validatedData.date, "dd/MM/yyyy", { locale: ptBR });
      const horaFormatada = validatedData.time;
      const clientName = profile?.name || "Cliente";
      
      const mensagem = `Olá! 👋

Sou *${clientName}* e acabei de confirmar meu agendamento na *Barbearia Innovation Barbershop*:

📅 *Data:* ${dataFormatada}
🕐 *Horário:* ${horaFormatada}
✂️ *Serviço:* ${validatedData.service}
💈 *Barbeiro:* ${validatedData.barber}

Aguardo confirmação. Obrigado!`;

      const mensagemCodificada = encodeURIComponent(mensagem);
      const phoneNumber = "5516993358197";
      
      // Detectar se é mobile ou desktop
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const whatsappUrl = isMobile
        ? `https://wa.me/${phoneNumber}?text=${mensagemCodificada}`
        : `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${mensagemCodificada}`;
      
      window.open(whatsappUrl, "_blank");
      
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
        return "Agendado";
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

  const formatPhoneInput = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setProfileForm({ ...profileForm, phone: formatted });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    try {
      const validatedData = profileSchema.parse({
        name: profileForm.name,
        phone: profileForm.phone || undefined,
      });

      const { error } = await supabase
        .from("profiles")
        .update({
          name: validatedData.name,
          phone: validatedData.phone || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      setIsEditProfileOpen(false);
      fetchProfile();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao atualizar perfil");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <header className="border-b border-border glass-panel sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <img 
              src={logo} 
              alt="Logo Barbearia Master" 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain pulse-glow border-2 border-white rounded-xl p-1.5 sm:p-2 bg-gradient-to-br from-background/10 to-background/5 backdrop-blur-sm" 
            />
            <h1 className="text-lg sm:text-2xl font-bold">Innovation Barbershop</h1>
          </div>
          <Button variant="outline" onClick={signOut} className="btn-futuristic text-xs sm:text-sm px-2 sm:px-4">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
        <div className="mb-4 sm:mb-8">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                Meu Perfil
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditProfileOpen(true)}
                className="btn-futuristic text-xs sm:text-sm"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
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
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {!profile.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="italic">Telefone não cadastrado</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plano de Assinatura */}
        <div className="mb-4 sm:mb-8">
          <Card className={cn("glass-panel", subscription && "border-primary/50")}>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                Plano Cabelo Semanal
              </CardTitle>
              {subscription ? (
                <span className="flex items-center gap-1 text-xs sm:text-sm text-green-500 font-medium">
                  <Check className="h-4 w-4" />
                  Ativo
                </span>
              ) : (
                <span className="text-lg sm:text-xl font-bold text-primary">R$ 80,00</span>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {subscription ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Você tem direito a <strong>1 corte por semana</strong>. Seu calendário agora mostra visualização semanal.
                  </p>
                  {subscription.expires_at && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <p className="text-sm font-medium text-primary">
                        {differenceInDays(new Date(subscription.expires_at), new Date()) > 0 ? (
                          <>Restam <strong>{differenceInDays(new Date(subscription.expires_at), new Date())}</strong> dias no seu plano</>
                        ) : (
                          <>Seu plano vence <strong>hoje</strong></>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Válido até: {format(new Date(subscription.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Assinatura ativa desde: {format(new Date(subscription.subscribed_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelSubscription}
                    className="text-destructive hover:text-destructive"
                  >
                    Cancelar Plano
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      1 corte garantido por semana
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Calendário semanal exclusivo
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Economia de até R$ 40,00/mês
                    </li>
                  </ul>
                  <Button 
                    onClick={() => setIsSubscribeDialogOpen(true)} 
                    className="w-full btn-futuristic"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Aderir ao Plano
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="glass-panel">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Novo Agendamento</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Agende seu próximo atendimento</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <form onSubmit={handleCreateAppointment} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Serviço</Label>
                  {subscription ? (
                    <div className="p-3 rounded-lg border border-primary/50 bg-primary/10">
                      <p className="text-sm font-medium">Corte</p>
                      <p className="text-xs text-muted-foreground">Serviço incluso no seu plano semanal</p>
                    </div>
                  ) : (
                    <ServiceSelector
                      value={newAppointment.service}
                      onChange={(value) => setNewAppointment({ ...newAppointment, service: value })}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Barbeiro</Label>
                  <BarberSelector
                    value={newAppointment.barber}
                    onChange={(value) => {
                      setNewAppointment({ ...newAppointment, barber: value, time: "" });
                      setAvailableSlots([]);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Data</Label>
                  {subscription ? (
                    // Calendário Semanal para assinantes
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                          className="px-2 sm:px-3 text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">← Semana anterior</span>
                          <span className="sm:hidden">← Ant.</span>
                        </Button>
                        <span className="text-xs sm:text-sm font-medium text-center flex-1">
                          {format(currentWeekStart, "dd/MM", { locale: ptBR })} - {format(addDays(currentWeekStart, 6), "dd/MM", { locale: ptBR })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                          className="px-2 sm:px-3 text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">Próxima semana →</span>
                          <span className="sm:hidden">Próx. →</span>
                        </Button>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {weekDays.map((day) => {
                          const isToday = isSameDay(day, new Date());
                          const isPast = day < new Date() && !isToday;
                          const isSelected = newAppointment.date && isSameDay(day, newAppointment.date);
                          
                          return (
                            <Button
                              key={day.toISOString()}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              disabled={isPast}
                              onClick={() => {
                                setNewAppointment({ ...newAppointment, date: day, time: "" });
                                setAvailableSlots([]);
                              }}
                              className={cn(
                                "flex flex-col h-auto py-1.5 sm:py-2 px-0.5 sm:px-1 min-w-0",
                                isToday && !isSelected && "border-primary",
                                isPast && "opacity-50"
                              )}
                            >
                              <span className="text-[8px] sm:text-[10px] uppercase truncate">
                                {format(day, "EEE", { locale: ptBR })}
                              </span>
                              <span className="text-xs sm:text-sm font-bold">
                                {format(day, "dd")}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // Calendário Mensal padrão
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9 sm:h-10 text-sm",
                            !newAppointment.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newAppointment.date ? (
                            format(newAppointment.date, "dd/MM/yyyy", { locale: ptBR })
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
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="text-xs sm:text-sm">Horário</Label>
                  {!newAppointment.barber || !newAppointment.date ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Selecione barbeiro e data primeiro
                    </p>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-xs sm:text-sm text-red-500">
                      Sem horários disponíveis
                    </p>
                  ) : (
                    <Select
                      value={newAppointment.time}
                      onValueChange={(value) => setNewAppointment({ ...newAppointment, time: value })}
                      required
                    >
                      <SelectTrigger id="time" className="h-9 sm:h-10 text-sm">
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
                  <Label htmlFor="notes" className="text-xs sm:text-sm">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Alguma observação especial?"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                    className="text-sm min-h-[60px] sm:min-h-[80px]"
                  />
                </div>

                <Button type="submit" className="w-full btn-futuristic h-9 sm:h-10 text-sm">
                  Confirmar Agendamento
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Meus Agendamentos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Histórico de atendimentos</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {loading ? (
                <p className="text-center text-muted-foreground">Carregando...</p>
              ) : appointments.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum agendamento encontrado</p>
              ) : (
                <div className="space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="p-3 sm:p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-semibold text-sm sm:text-base">{appointment.service}</h3>
                        <span className={cn("text-xs sm:text-sm font-medium flex-shrink-0", getStatusColor(appointment.status))}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        <strong>Barbeiro:</strong> {appointment.barber}
                      </p>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(appointment.scheduled_date), "dd/MM/yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {appointment.scheduled_time.substring(0, 5)}
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{appointment.notes}</p>
                      )}
                      {appointment.status === "agendado" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setCancelConfirmId(appointment.id)}
                          className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                        >
                          <XCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Cancelar
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

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="glass-panel">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo *</Label>
              <Input
                id="edit-name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                placeholder="(99) 99999-9999"
                value={profileForm.phone}
                onChange={handlePhoneChange}
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                Formato: (99) 99999-9999
              </p>
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-futuristic">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Assinatura */}
      <AlertDialog open={isSubscribeDialogOpen} onOpenChange={setIsSubscribeDialogOpen}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Aderir ao Plano Cabelo Semanal
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Você está prestes a aderir ao plano de <strong>R$ 80,00/mês</strong>.</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  1 corte garantido por semana
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Calendário semanal exclusivo para agendamentos
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                * O pagamento deve ser feito presencialmente na barbearia.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubscribe} className="btn-futuristic">
              Confirmar Adesão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}