import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Package, Scissors, Plus, Trash2, Zap, Droplets, Wifi, MoreHorizontal } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getServicePrice } from "@/lib/services";
import { BARBERS } from "@/lib/barbers";

interface BillingStats {
  servicesRevenue: number;
  servicesCount: number;
  productsRevenue: number;
  productsProfit: number;
  productsSalesCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { value: "luz", label: "Luz", icon: Zap },
  { value: "agua", label: "Água", icon: Droplets },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "outros", label: "Outros", icon: MoreHorizontal },
];

export default function BillingReport() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BillingStats>({
    servicesRevenue: 0,
    servicesCount: 0,
    productsRevenue: 0,
    productsProfit: 0,
    productsSalesCount: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "outros",
    expense_date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchBillingStats();
    fetchExpenses();
  }, [selectedPeriod, selectedBarber]);

  const getPeriodDates = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case "current":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "last":
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case "all":
        startDate = new Date(2000, 0, 1);
        endDate = new Date(2100, 11, 31);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  };

  const fetchExpenses = async () => {
    try {
      const { startDate, endDate } = getPeriodDates();

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (error) throw error;

      setExpenses(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar gastos:", error);
    }
  };

  const fetchBillingStats = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getPeriodDates();

      // Buscar receita de serviços (agendamentos concluídos)
      let appointmentsQuery = supabase
        .from("appointments")
        .select("service, barber")
        .eq("status", "concluido")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate);

      // Aplicar filtro por barbeiro se selecionado
      if (selectedBarber !== "all") {
        appointmentsQuery = appointmentsQuery.eq("barber", selectedBarber);
      }

      const { data: appointments, error: appointmentsError } = await appointmentsQuery;

      if (appointmentsError) throw appointmentsError;

      // Calcular receita de serviços usando os preços do catálogo
      const servicesRevenue = appointments?.reduce((total, apt) => {
        return total + getServicePrice(apt.service);
      }, 0) || 0;

      // Buscar vendas de produtos
      const { data: productSales, error: salesError } = await supabase
        .from("product_sales")
        .select("total_sale, profit")
        .gte("sold_at", startDate)
        .lte("sold_at", endDate);

      if (salesError) throw salesError;

      const productsRevenue = productSales?.reduce((total, sale) => total + parseFloat(sale.total_sale.toString()), 0) || 0;
      const productsProfit = productSales?.reduce((total, sale) => total + parseFloat(sale.profit.toString()), 0) || 0;

      // Buscar gastos do período
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate);

      if (expensesError) throw expensesError;

      const totalExpenses = expensesData?.reduce((total, exp) => total + parseFloat(exp.amount.toString()), 0) || 0;

      const totalRevenue = servicesRevenue + productsRevenue;
      const netProfit = totalRevenue - totalExpenses;

      setStats({
        servicesRevenue,
        servicesCount: appointments?.length || 0,
        productsRevenue,
        productsProfit,
        productsSalesCount: productSales?.length || 0,
        totalRevenue,
        totalProfit: productsProfit,
        totalExpenses,
        netProfit,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar relatório de faturamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { error } = await supabase.from("expenses").insert({
        description: newExpense.description.trim(),
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        expense_date: newExpense.expense_date,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Gasto registrado com sucesso!");
      setIsAddExpenseOpen(false);
      setNewExpense({
        description: "",
        amount: "",
        category: "outros",
        expense_date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchExpenses();
      fetchBillingStats();
    } catch (error: any) {
      toast.error("Erro ao registrar gasto");
      console.error(error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;

      toast.success("Gasto removido com sucesso!");
      fetchExpenses();
      fetchBillingStats();
    } catch (error: any) {
      toast.error("Erro ao remover gasto");
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPeriodLabel = () => {
    const now = new Date();
    let periodText = "";
    
    switch (selectedPeriod) {
      case "current":
        periodText = format(now, "MMMM 'de' yyyy", { locale: ptBR });
        break;
      case "last":
        periodText = format(subMonths(now, 1), "MMMM 'de' yyyy", { locale: ptBR });
        break;
      case "all":
        periodText = "Todo o período";
        break;
      default:
        periodText = "";
    }

    const barberText = selectedBarber === "all" ? "Todos os barbeiros" : selectedBarber;
    return `${periodText} • ${barberText}`;
  };

  const getCategoryIcon = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : MoreHorizontal;
  };

  const getCategoryLabel = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : "Outros";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Relatório de Faturamento</h3>
          <p className="text-sm text-muted-foreground capitalize">{getPeriodLabel()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border">
              <DialogHeader>
                <DialogTitle>Registrar Gasto</DialogTitle>
                <DialogDescription>
                  Adicione gastos da barbearia como luz, água, internet, etc.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-description">Descrição *</Label>
                  <Input
                    id="expense-description"
                    placeholder="Ex: Conta de luz dezembro"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Valor (R$) *</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-category">Categoria</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  >
                    <SelectTrigger id="expense-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Data</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleAddExpense}>
                  Registrar Gasto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Select value={selectedBarber} onValueChange={setSelectedBarber}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por barbeiro" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="all">Todos os barbeiros</SelectItem>
              {BARBERS.map((barber) => (
                <SelectItem key={barber} value={barber}>
                  {barber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="current">Mês Atual</SelectItem>
              <SelectItem value="last">Mês Anterior</SelectItem>
              <SelectItem value="all">Todo o Período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando dados...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Serviços + Produtos
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Serviços</CardTitle>
              <Scissors className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.servicesRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.servicesCount} atendimentos
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.productsRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.productsSalesCount} vendas
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gastos</CardTitle>
              <Zap className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Luz, Água, Internet...
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(stats.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receita - Gastos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Resumo Detalhado</CardTitle>
            <CardDescription>Análise completa do período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-lg bg-card/50 border border-border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Serviços
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de atendimentos:</span>
                    <span className="font-medium">{stats.servicesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receita total:</span>
                    <span className="font-medium">{formatCurrency(stats.servicesRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket médio:</span>
                    <span className="font-medium">
                      {formatCurrency(stats.servicesCount > 0 ? stats.servicesRevenue / stats.servicesCount : 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-card/50 border border-border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de vendas:</span>
                    <span className="font-medium">{stats.productsSalesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receita total:</span>
                    <span className="font-medium">{formatCurrency(stats.productsRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lucro total:</span>
                    <span className="font-medium text-green-500">
                      {formatCurrency(stats.productsProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margem de lucro:</span>
                    <span className="font-medium text-green-500">
                      {stats.productsRevenue > 0
                        ? ((stats.productsProfit / stats.productsRevenue) * 100).toFixed(1)
                        : "0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Gastos do Período
            </CardTitle>
            <CardDescription>Despesas registradas (luz, água, internet, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum gasto registrado neste período.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {expenses.map((expense) => {
                  const CategoryIcon = getCategoryIcon(expense.category);
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <CategoryIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {getCategoryLabel(expense.category)} • {format(new Date(expense.expense_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-500">
                          -{formatCurrency(expense.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
