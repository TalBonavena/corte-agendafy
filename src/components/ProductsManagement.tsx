import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, Edit, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().trim().max(500, "Descrição muito longa").optional(),
  sale_price: z.number().min(0, "Preço de venda deve ser positivo"),
  cost_price: z.number().min(0, "Preço de custo deve ser positivo"),
  stock_quantity: z.number().int().min(0, "Estoque deve ser positivo"),
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  sale_price: number;
  cost_price: number;
  stock_quantity: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sale_price: "",
    cost_price: "",
    stock_quantity: "",
    is_active: true,
    image_url: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        sale_price: product.sale_price.toString(),
        cost_price: product.cost_price.toString(),
        stock_quantity: product.stock_quantity.toString(),
        is_active: product.is_active,
        image_url: product.image_url || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        sale_price: "",
        cost_price: "",
        stock_quantity: "0",
        is_active: true,
        image_url: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = productSchema.parse({
        name: formData.name,
        description: formData.description || undefined,
        sale_price: parseFloat(formData.sale_price),
        cost_price: parseFloat(formData.cost_price),
        stock_quantity: parseInt(formData.stock_quantity),
      });

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update({
            name: validatedData.name,
            description: validatedData.description || null,
            sale_price: validatedData.sale_price,
            cost_price: validatedData.cost_price,
            stock_quantity: validatedData.stock_quantity,
            is_active: formData.is_active,
            image_url: formData.image_url || null,
          })
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("products")
          .insert({
            name: validatedData.name,
            description: validatedData.description || null,
            sale_price: validatedData.sale_price,
            cost_price: validatedData.cost_price,
            stock_quantity: validatedData.stock_quantity,
            is_active: formData.is_active,
            image_url: formData.image_url || null,
          });

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }

      setIsDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao salvar produto");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Produto excluído com sucesso!");
      setDeleteConfirmId(null);
      fetchProducts();
    } catch (error: any) {
      toast.error("Erro ao excluir produto");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">Carregando produtos...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Produtos Cadastrados</h3>
        <Button onClick={() => handleOpenDialog()} className="btn-futuristic">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Nenhum produto cadastrado</p>
          <Button onClick={() => handleOpenDialog()} className="btn-futuristic">
            Cadastrar Primeiro Produto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className={`p-4 rounded-lg border transition-colors ${
                product.is_active
                  ? "border-border bg-card/50 hover:bg-card"
                  : "border-muted bg-muted/30 opacity-60"
              }`}
            >
              {product.image_url && (
                <div className="mb-3">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{product.name}</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(product)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteConfirmId(product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {product.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {product.description}
                </p>
              )}
              
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Preço Venda:</strong> {formatCurrency(product.sale_price)}
                </p>
                <p>
                  <strong>Preço Custo:</strong> {formatCurrency(product.cost_price)}
                </p>
                <p>
                  <strong>Lucro:</strong>{" "}
                  <span className="text-green-500">
                    {formatCurrency(product.sale_price - product.cost_price)}
                  </span>
                </p>
                <p>
                  <strong>Estoque:</strong> {product.stock_quantity} unidades
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={product.is_active ? "text-green-500" : "text-red-500"}>
                    {product.is_active ? "Ativo" : "Inativo"}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-panel max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Atualize as informações do produto"
                : "Cadastre um novo produto para venda"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Link da Foto (URL)</Label>
              <Input
                id="image_url"
                type="url"
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-md"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço de Venda *</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price">Preço de Custo *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Quantidade em Estoque *</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Produto ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-futuristic">
                {editingProduct ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}