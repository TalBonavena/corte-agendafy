import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Scissors, Crown, Plus, Edit, Trash2, Save, X } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration: string;
  price: number;
  is_active: boolean;
  display_order: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cuts_per_week: number;
  allowed_services: string[];
  is_active: boolean;
  display_order: number;
}

export default function PriceSettings() {
  const [services, setServices] = useState<Service[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Service form
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({ name: "", duration: "", price: 0 });
  const [showNewServiceDialog, setShowNewServiceDialog] = useState(false);
  
  // Plan form
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [newPlan, setNewPlan] = useState({ 
    name: "", 
    description: "", 
    price: 0, 
    cuts_per_week: 1,
    allowed_services: ["Corte"]
  });
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesRes, plansRes] = await Promise.all([
        supabase.from("services").select("*").order("display_order"),
        supabase.from("subscription_plans").select("*").order("display_order")
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (plansRes.error) throw plansRes.error;

      setServices(servicesRes.data || []);
      setPlans(plansRes.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  // Service handlers
  const handleUpdateServicePrice = async (id: string, price: number) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ price })
        .eq("id", id);

      if (error) throw error;
      
      setServices(prev => prev.map(s => s.id === id ? { ...s, price } : s));
      toast.success("Preço atualizado!");
    } catch (error: any) {
      console.error("Error updating price:", error);
      toast.error("Erro ao atualizar preço");
    }
  };

  const handleUpdateService = async (service: Service) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: service.name,
          duration: service.duration,
          price: service.price,
          is_active: service.is_active
        })
        .eq("id", service.id);

      if (error) throw error;
      
      setServices(prev => prev.map(s => s.id === service.id ? service : s));
      setEditingService(null);
      toast.success("Serviço atualizado!");
    } catch (error: any) {
      console.error("Error updating service:", error);
      toast.error("Erro ao atualizar serviço");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async () => {
    if (!newService.name || !newService.duration) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .insert({
          name: newService.name,
          duration: newService.duration,
          price: newService.price,
          display_order: services.length + 1
        })
        .select()
        .single();

      if (error) throw error;
      
      setServices(prev => [...prev, data]);
      setNewService({ name: "", duration: "", price: 0 });
      setShowNewServiceDialog(false);
      toast.success("Serviço criado!");
    } catch (error: any) {
      console.error("Error creating service:", error);
      toast.error("Erro ao criar serviço");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success("Serviço removido!");
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast.error("Erro ao remover serviço");
    }
  };

  const handleToggleServiceActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
      
      setServices(prev => prev.map(s => s.id === id ? { ...s, is_active } : s));
      toast.success(is_active ? "Serviço ativado!" : "Serviço desativado!");
    } catch (error: any) {
      console.error("Error toggling service:", error);
      toast.error("Erro ao atualizar serviço");
    }
  };

  // Plan handlers
  const handleUpdatePlan = async (plan: SubscriptionPlan) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name: plan.name,
          description: plan.description,
          price: plan.price,
          cuts_per_week: plan.cuts_per_week,
          allowed_services: plan.allowed_services,
          is_active: plan.is_active
        })
        .eq("id", plan.id);

      if (error) throw error;
      
      setPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
      setEditingPlan(null);
      toast.success("Plano atualizado!");
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast.error("Erro ao atualizar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name) {
      toast.error("Preencha o nome do plano");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .insert({
          name: newPlan.name,
          description: newPlan.description,
          price: newPlan.price,
          cuts_per_week: newPlan.cuts_per_week,
          allowed_services: newPlan.allowed_services,
          display_order: plans.length + 1
        })
        .select()
        .single();

      if (error) throw error;
      
      setPlans(prev => [...prev, data]);
      setNewPlan({ name: "", description: "", price: 0, cuts_per_week: 1, allowed_services: ["Corte"] });
      setShowNewPlanDialog(false);
      toast.success("Plano criado!");
    } catch (error: any) {
      console.error("Error creating plan:", error);
      toast.error("Erro ao criar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success("Plano removido!");
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      toast.error("Erro ao remover plano");
    }
  };

  const handleTogglePlanActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
      
      setPlans(prev => prev.map(p => p.id === id ? { ...p, is_active } : p));
      toast.success(is_active ? "Plano ativado!" : "Plano desativado!");
    } catch (error: any) {
      console.error("Error toggling plan:", error);
      toast.error("Erro ao atualizar plano");
    }
  };

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`;
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">Carregando configurações...</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configuração de Preços
          </CardTitle>
          <CardDescription>
            Gerencie os preços dos serviços e planos de assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Serviços
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Planos
              </TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Serviços Disponíveis</h3>
                <Dialog open={showNewServiceDialog} onOpenChange={setShowNewServiceDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="btn-futuristic">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Serviço
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Serviço</DialogTitle>
                      <DialogDescription>Adicione um novo serviço à lista</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-service-name">Nome</Label>
                        <Input
                          id="new-service-name"
                          value={newService.name}
                          onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Corte+Barba"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-service-duration">Duração</Label>
                        <Input
                          id="new-service-duration"
                          value={newService.duration}
                          onChange={(e) => setNewService(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="Ex: 30min, 1hr"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-service-price">Preço (R$)</Label>
                        <Input
                          id="new-service-price"
                          type="number"
                          step="0.01"
                          value={newService.price}
                          onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewServiceDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateService} disabled={saving}>
                        {saving ? "Salvando..." : "Criar Serviço"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      service.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    {editingService?.id === service.id ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        <Input
                          value={editingService.name}
                          onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                          placeholder="Nome"
                        />
                        <Input
                          value={editingService.duration}
                          onChange={(e) => setEditingService({ ...editingService, duration: e.target.value })}
                          placeholder="Duração"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={editingService.price}
                          onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) || 0 })}
                          placeholder="Preço"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateService(editingService)} disabled={saving}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingService(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.duration}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-primary">{formatPrice(service.price)}</span>
                          <Switch
                            checked={service.is_active}
                            onCheckedChange={(checked) => handleToggleServiceActive(service.id, checked)}
                          />
                          <Button size="sm" variant="ghost" onClick={() => setEditingService(service)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteService(service.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Planos de Assinatura</h3>
                <Dialog open={showNewPlanDialog} onOpenChange={setShowNewPlanDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="btn-futuristic">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Plano
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Plano de Assinatura</DialogTitle>
                      <DialogDescription>Adicione um novo plano de assinatura</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-plan-name">Nome do Plano</Label>
                        <Input
                          id="new-plan-name"
                          value={newPlan.name}
                          onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Plano Premium"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-plan-description">Descrição</Label>
                        <Textarea
                          id="new-plan-description"
                          value={newPlan.description}
                          onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrição do plano"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-plan-price">Preço Mensal (R$)</Label>
                          <Input
                            id="new-plan-price"
                            type="number"
                            step="0.01"
                            value={newPlan.price}
                            onChange={(e) => setNewPlan(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-plan-cuts">Cortes por Semana</Label>
                          <Input
                            id="new-plan-cuts"
                            type="number"
                            min="1"
                            value={newPlan.cuts_per_week}
                            onChange={(e) => setNewPlan(prev => ({ ...prev, cuts_per_week: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Serviços Inclusos</Label>
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                          {services.filter(s => s.is_active).map((service) => (
                            <label key={service.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newPlan.allowed_services.includes(service.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewPlan(prev => ({ 
                                      ...prev, 
                                      allowed_services: [...prev.allowed_services, service.name] 
                                    }));
                                  } else {
                                    setNewPlan(prev => ({ 
                                      ...prev, 
                                      allowed_services: prev.allowed_services.filter(s => s !== service.name) 
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{service.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewPlanDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreatePlan} disabled={saving}>
                        {saving ? "Salvando..." : "Criar Plano"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`${!plan.is_active ? "opacity-60" : ""}`}>
                    <CardContent className="pt-4">
                      {editingPlan?.id === plan.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Nome</Label>
                              <Input
                                value={editingPlan.name}
                                onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Preço Mensal (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingPlan.price}
                                onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Textarea
                              value={editingPlan.description || ""}
                              onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Cortes por Semana</Label>
                            <Input
                              type="number"
                              min="1"
                              value={editingPlan.cuts_per_week}
                              onChange={(e) => setEditingPlan({ ...editingPlan, cuts_per_week: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                          <div>
                            <Label>Serviços Inclusos</Label>
                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                              {services.filter(s => s.is_active).map((service) => (
                                <label key={service.id} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={editingPlan.allowed_services.includes(service.name)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditingPlan({ 
                                          ...editingPlan, 
                                          allowed_services: [...editingPlan.allowed_services, service.name] 
                                        });
                                      } else {
                                        setEditingPlan({ 
                                          ...editingPlan, 
                                          allowed_services: editingPlan.allowed_services.filter(s => s !== service.name) 
                                        });
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span className="text-sm">{service.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleUpdatePlan(editingPlan)} disabled={saving}>
                              <Save className="h-4 w-4 mr-2" />
                              Salvar
                            </Button>
                            <Button variant="outline" onClick={() => setEditingPlan(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Crown className="h-5 w-5 text-primary" />
                              <h4 className="font-bold text-lg">{plan.name}</h4>
                            </div>
                            {plan.description && (
                              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {plan.cuts_per_week} corte(s)/semana
                              </span>
                              {plan.allowed_services.map((service) => (
                                <span key={service} className="text-xs bg-muted px-2 py-1 rounded">
                                  {service}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-2xl text-primary">{formatPrice(plan.price)}</span>
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={(checked) => handleTogglePlanActive(plan.id, checked)}
                            />
                            <Button size="sm" variant="ghost" onClick={() => setEditingPlan(plan)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeletePlan(plan.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {plans.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum plano cadastrado. Clique em "Novo Plano" para adicionar.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
