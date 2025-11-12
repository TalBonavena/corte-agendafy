import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart } from "lucide-react";
import { z } from "zod";

const saleSchema = z.object({
  product_id: z.string().uuid("Produto inválido"),
  quantity: z.number().int().min(1, "Quantidade mínima é 1"),
  notes: z.string().max(500, "Observações muito longas").optional(),
});

interface Product {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  stock_quantity: number;
  is_active: boolean;
}

export default function ProductSale() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "1",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchActiveProducts();
    }
  }, [isOpen]);

  const fetchActiveProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar produtos");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    try {
      const validatedData = saleSchema.parse({
        product_id: formData.product_id,
        quantity: parseInt(formData.quantity),
        notes: formData.notes || undefined,
      });

      // Buscar produto para obter preços
      const product = products.find((p) => p.id === validatedData.product_id);
      if (!product) {
        toast.error("Produto não encontrado");
        return;
      }

      // Verificar estoque
      if (product.stock_quantity < validatedData.quantity) {
        toast.error("Estoque insuficiente");
        return;
      }

      // Calcular valores
      const totalSale = product.sale_price * validatedData.quantity;
      const totalCost = product.cost_price * validatedData.quantity;
      const profit = totalSale - totalCost;

      // Registrar venda
      const { error: saleError } = await supabase.from("product_sales").insert({
        product_id: validatedData.product_id,
        quantity: validatedData.quantity,
        sale_price: product.sale_price,
        cost_price: product.cost_price,
        total_sale: totalSale,
        total_cost: totalCost,
        profit: profit,
        sold_by: user.id,
        notes: validatedData.notes || null,
      });

      if (saleError) throw saleError;

      // Atualizar estoque
      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock_quantity: product.stock_quantity - validatedData.quantity,
        })
        .eq("id", validatedData.product_id);

      if (stockError) throw stockError;

      toast.success("Venda registrada com sucesso!");
      setIsOpen(false);
      setFormData({ product_id: "", quantity: "1", notes: "" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao registrar venda");
      }
    }
  };

  const selectedProduct = products.find((p) => p.id === formData.product_id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="btn-futuristic">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Registrar Venda
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>Registrar Venda de Produto</DialogTitle>
          <DialogDescription>
            Registre a venda de um produto e atualize o estoque automaticamente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produto *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              required
            >
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - R$ {product.sale_price.toFixed(2)} (Est: {product.stock_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedProduct?.stock_quantity || 999}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Estoque disponível: {selectedProduct.stock_quantity} unidades
              </p>
            )}
          </div>

          {selectedProduct && formData.quantity && (
            <div className="p-4 rounded-lg bg-card/50 border border-border space-y-1">
              <p className="text-sm">
                <strong>Preço unitário:</strong> R$ {selectedProduct.sale_price.toFixed(2)}
              </p>
              <p className="text-sm">
                <strong>Total:</strong> R${" "}
                {(selectedProduct.sale_price * parseInt(formData.quantity || "0")).toFixed(2)}
              </p>
              <p className="text-sm text-green-500">
                <strong>Lucro:</strong> R${" "}
                {(
                  (selectedProduct.sale_price - selectedProduct.cost_price) *
                  parseInt(formData.quantity || "0")
                ).toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre a venda (opcional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-futuristic" disabled={!formData.product_id || !formData.quantity}>
              Registrar Venda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}