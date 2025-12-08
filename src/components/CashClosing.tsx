import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  History,
  Trash2,
  Wallet,
  Package,
  Scissors,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getServicePrice } from "@/lib/services";

interface CashClosing {
  id: string;
  closing_date: string;
  opening_balance: number;
  services_revenue: number;
  products_revenue: number;
  other_income: number;
  expenses: number;
  expenses_description: string | null;
  final_balance: number;
  notes: string | null;
  closed_by: string;
  created_at: string;
}

interface DaySummary {
  servicesRevenue: number;
  productsRevenue: number;
  totalAppointments: number;
  totalProductSales: number;
}

export default function CashClosing() {
  const { user } = useAuth();
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewClosingOpen, setIsNewClosingOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  const [formData, setFormData] = useState({
    opening_balance: "",
    other_income: "",
    expenses: "",
    expenses_description: "",
    notes: "",
  });

  useEffect(() => {
    fetchClosings();
  }, []);

  useEffect(() => {
    if (isNewClosingOpen && selectedDate) {
      fetchDaySummary(selectedDate);
    }
  }, [isNewClosingOpen, selectedDate]);

  const fetchClosings = async () => {
    try {
      const { data, error } = await supabase
        .from("cash_closings")
        .select("*")
        .order("closing_date", { ascending: false });

      if (error) throw error;
      setClosings(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar fechamentos:", error);
      toast.error("Erro ao carregar histórico de fechamentos");
    } finally {
      setLoading(false);
    }
  };

  const fetchDaySummary = async (date: Date) => {
    setLoadingSummary(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");

      // Buscar agendamentos concluídos do dia
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("service")
        .eq("scheduled_date", dateStr)
        .eq("status", "concluido");

      if (appointmentsError) throw appointmentsError;

      // Calcular receita de serviços
      let servicesRevenue = 0;
      appointments?.forEach((apt) => {
        servicesRevenue += getServicePrice(apt.service);
      });

      // Buscar vendas de produtos do dia
      const { data: productSales, error: salesError } = await supabase
        .from("product_sales")
        .select("total_sale")
        .gte("sold_at", `${dateStr}T00:00:00`)
        .lt("sold_at", `${dateStr}T23:59:59`);

      if (salesError) throw salesError;

      const productsRevenue = productSales?.reduce((sum, sale) => sum + Number(sale.total_sale), 0) || 0;

      setDaySummary({
        servicesRevenue,
        productsRevenue,
        totalAppointments: appointments?.length || 0,
        totalProductSales: productSales?.length || 0,
      });
    } catch (error: any) {
      console.error("Erro ao calcular resumo:", error);
      toast.error("Erro ao calcular resumo do dia");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCreateClosing = async () => {
    if (!user || !daySummary) return;

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Verificar se já existe fechamento para esta data
      const { data: existing } = await supabase
        .from("cash_closings")
        .select("id")
        .eq("closing_date", dateStr)
        .maybeSingle();

      if (existing) {
        toast.error("Já existe um fechamento para esta data");
        return;
      }

      const openingBalance = parseFloat(formData.opening_balance) || 0;
      const otherIncome = parseFloat(formData.other_income) || 0;
      const expenses = parseFloat(formData.expenses) || 0;
      
      const finalBalance = openingBalance + daySummary.servicesRevenue + daySummary.productsRevenue + otherIncome - expenses;

      const { error } = await supabase.from("cash_closings").insert({
        closing_date: dateStr,
        opening_balance: openingBalance,
        services_revenue: daySummary.servicesRevenue,
        products_revenue: daySummary.productsRevenue,
        other_income: otherIncome,
        expenses: expenses,
        expenses_description: formData.expenses_description || null,
        final_balance: finalBalance,
        notes: formData.notes || null,
        closed_by: user.id,
      });

      if (error) throw error;

      toast.success("Fechamento de caixa realizado com sucesso!");
      setIsNewClosingOpen(false);
      setFormData({
        opening_balance: "",
        other_income: "",
        expenses: "",
        expenses_description: "",
        notes: "",
      });
      fetchClosings();
    } catch (error: any) {
      console.error("Erro ao criar fechamento:", error);
      toast.error("Erro ao realizar fechamento de caixa");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("cash_closings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Fechamento excluído com sucesso");
      fetchClosings();
    } catch (error: any) {
      console.error("Erro ao excluir fechamento:", error);
      toast.error("Erro ao excluir fechamento");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  const totalRevenue = daySummary 
    ? daySummary.servicesRevenue + daySummary.productsRevenue + (parseFloat(formData.other_income) || 0)
    : 0;
  
  const projectedBalance = daySummary
    ? (parseFloat(formData.opening_balance) || 0) + totalRevenue - (parseFloat(formData.expenses) || 0)
    : 0;

  return (
    <div className="space-y-6">
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Fechamento de Caixa
            </CardTitle>
            <CardDescription>Realize o fechamento diário e consulte o histórico</CardDescription>
          </div>
          <Button onClick={() => setIsNewClosingOpen(true)} className="btn-futuristic">
            <Plus className="mr-2 h-4 w-4" />
            Novo Fechamento
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : closings.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum fechamento registrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Novo Fechamento" para registrar o primeiro
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {closings.map((closing) => (
                <div
                  key={closing.id}
                  className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {format(new Date(closing.closing_date + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Scissors className="h-3 w-3" />
                          Serviços: {formatCurrency(closing.services_revenue)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Produtos: {formatCurrency(closing.products_revenue)}
                        </span>
                        {closing.expenses > 0 && (
                          <span className="flex items-center gap-1 text-destructive">
                            <TrendingDown className="h-3 w-3" />
                            Despesas: {formatCurrency(closing.expenses)}
                          </span>
                        )}
                      </div>
                      {closing.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {closing.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Saldo Final</p>
                        <p className={cn(
                          "text-lg font-bold",
                          closing.final_balance >= 0 ? "text-green-500" : "text-destructive"
                        )}>
                          {formatCurrency(closing.final_balance)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(closing.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Fechamento */}
      <Dialog open={isNewClosingOpen} onOpenChange={setIsNewClosingOpen}>
        <DialogContent className="glass-panel max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Novo Fechamento de Caixa
            </DialogTitle>
            <DialogDescription>
              Registre o fechamento do dia selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Seleção de Data */}
            <div className="space-y-2">
              <Label>Data do Fechamento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass-panel">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Resumo Automático */}
            {loadingSummary ? (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-muted-foreground">Calculando resumo do dia...</p>
              </div>
            ) : daySummary && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Resumo Automático do Dia
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded bg-background/50">
                    <p className="text-muted-foreground text-xs">Serviços ({daySummary.totalAppointments})</p>
                    <p className="font-semibold text-green-500">{formatCurrency(daySummary.servicesRevenue)}</p>
                  </div>
                  <div className="p-2 rounded bg-background/50">
                    <p className="text-muted-foreground text-xs">Produtos ({daySummary.totalProductSales})</p>
                    <p className="font-semibold text-green-500">{formatCurrency(daySummary.productsRevenue)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Saldo Inicial */}
            <div className="space-y-2">
              <Label htmlFor="opening_balance">Saldo Inicial (Caixa)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Outras Entradas */}
            <div className="space-y-2">
              <Label htmlFor="other_income">Outras Entradas</Label>
              <div className="relative">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                <Input
                  id="other_income"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.other_income}
                  onChange={(e) => setFormData({ ...formData, other_income: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Despesas */}
            <div className="space-y-2">
              <Label htmlFor="expenses">Despesas / Saídas</Label>
              <div className="relative">
                <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                <Input
                  id="expenses"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.expenses}
                  onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Descrição das Despesas */}
            {(parseFloat(formData.expenses) || 0) > 0 && (
              <div className="space-y-2">
                <Label htmlFor="expenses_description">Descrição das Despesas</Label>
                <Input
                  id="expenses_description"
                  placeholder="Ex: Compra de produtos, conta de luz..."
                  value={formData.expenses_description}
                  onChange={(e) => setFormData({ ...formData, expenses_description: e.target.value })}
                />
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações adicionais..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Resumo Final */}
            {daySummary && (
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Saldo Inicial:</span>
                  <span>{formatCurrency(parseFloat(formData.opening_balance) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-500">
                  <span>+ Receitas Totais:</span>
                  <span>{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm text-destructive">
                  <span>- Despesas:</span>
                  <span>{formatCurrency(parseFloat(formData.expenses) || 0)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Saldo Final:</span>
                  <span className={projectedBalance >= 0 ? "text-green-500" : "text-destructive"}>
                    {formatCurrency(projectedBalance)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewClosingOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateClosing} className="btn-futuristic" disabled={!daySummary}>
              Fechar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fechamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fechamento de caixa? Esta ação não pode ser desfeita.
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