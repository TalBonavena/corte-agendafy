import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Package, Scissors } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BillingStats {
  servicesRevenue: number;
  servicesCount: number;
  productsRevenue: number;
  productsProfit: number;
  productsSalesCount: number;
  totalRevenue: number;
  totalProfit: number;
}

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
  });
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  useEffect(() => {
    fetchBillingStats();
  }, [selectedPeriod]);

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

  const fetchBillingStats = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getPeriodDates();

      // Buscar receita de serviços (agendamentos concluídos)
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("service")
        .eq("status", "concluido")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate);

      if (appointmentsError) throw appointmentsError;

      // Calcular receita de serviços baseado nos preços fixos
      const servicePrices: { [key: string]: number } = {
        "Corte Simples": 30,
        "Corte + Barba": 50,
        "Barba": 25,
        "Corte Infantil": 25,
        "Pigmentação": 40,
        "Luzes/Mechas": 80,
      };

      const servicesRevenue = appointments?.reduce((total, apt) => {
        return total + (servicePrices[apt.service] || 0);
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

      setStats({
        servicesRevenue,
        servicesCount: appointments?.length || 0,
        productsRevenue,
        productsProfit,
        productsSalesCount: productSales?.length || 0,
        totalRevenue: servicesRevenue + productsRevenue,
        totalProfit: productsProfit, // Apenas produtos têm lucro calculado
      });
    } catch (error: any) {
      toast.error("Erro ao carregar relatório de faturamento");
      console.error(error);
    } finally {
      setLoading(false);
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
    switch (selectedPeriod) {
      case "current":
        return format(now, "MMMM 'de' yyyy", { locale: ptBR });
      case "last":
        return format(subMonths(now, 1), "MMMM 'de' yyyy", { locale: ptBR });
      case "all":
        return "Todo o período";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Relatório de Faturamento</h3>
          <p className="text-sm text-muted-foreground capitalize">{getPeriodLabel()}</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="last">Mês Anterior</SelectItem>
            <SelectItem value="all">Todo o Período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando dados...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium">Lucro Produtos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(stats.productsProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem de lucro
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Resumo Detalhado</CardTitle>
          <CardDescription>Análise completa do período selecionado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
}