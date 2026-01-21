import { useState } from 'react';
import { useProducts, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useRawMaterials, useUpdateRawMaterial, useDeleteRawMaterial } from '@/hooks/useRawMaterials';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Warehouse, Package, Boxes, AlertTriangle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import type { Product, RawMaterial } from '@/types/erp';

export default function Inventory() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: materials = [], isLoading: materialsLoading } = useRawMaterials();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateMaterial = useUpdateRawMaterial();
  const deleteMaterial = useDeleteRawMaterial();

  const isLoading = productsLoading || materialsLoading;

  // Edit/delete state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'product' | 'material'; item: Product | RawMaterial } | null>(null);
  const [productFormData, setProductFormData] = useState({ current_stock: 0, minimum_stock: 0 });
  const [materialFormData, setMaterialFormData] = useState({ current_stock: 0, minimum_stock: 0, reorder_point: 0 });

  const productValue = products.reduce(
    (sum, p) => sum + Number(p.current_stock) * Number(p.selling_price),
    0
  );
  const materialValue = materials.reduce(
    (sum, m) => sum + Number(m.current_stock) * Number(m.cost_per_unit),
    0
  );
  const totalValue = productValue + materialValue;

  const lowStockProducts = products.filter((p) => p.current_stock <= p.minimum_stock);
  const lowStockMaterials = materials.filter((m) => m.current_stock <= m.minimum_stock);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({ current_stock: product.current_stock, minimum_stock: product.minimum_stock });
  };

  const handleEditMaterial = (material: RawMaterial) => {
    setEditingMaterial(material);
    setMaterialFormData({ 
      current_stock: material.current_stock, 
      minimum_stock: material.minimum_stock,
      reorder_point: material.reorder_point 
    });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    await updateProduct.mutateAsync({ id: editingProduct.id, ...productFormData });
    setEditingProduct(null);
  };

  const handleSaveMaterial = async () => {
    if (!editingMaterial) return;
    await updateMaterial.mutateAsync({ id: editingMaterial.id, ...materialFormData });
    setEditingMaterial(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'product') {
      await deleteProduct.mutateAsync(deleteConfirm.item.id);
    } else {
      await deleteMaterial.mutateAsync(deleteConfirm.item.id);
    }
    setDeleteConfirm(null);
  };

  const productColumns: Column<Product>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (item) => <span className="font-mono text-sm">{item.sku}</span>,
    },
    {
      key: 'name',
      header: 'Product',
      cell: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (item) => (
        <Badge variant={item.product_type === 'in_house' ? 'default' : 'secondary'}>
          {item.product_type === 'in_house' ? 'In-House' : 'Outsourced'}
        </Badge>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (item) => {
        const isLow = item.current_stock <= item.minimum_stock;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-medium text-destructive' : ''}>
              {item.current_stock} {item.unit}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        );
      },
    },
    {
      key: 'min',
      header: 'Min Level',
      cell: (item) => <span className="text-muted-foreground">{item.minimum_stock}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      cell: (item) => (
        <span className="font-medium">
          ${(Number(item.current_stock) * Number(item.selling_price)).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditProduct(item)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Stock
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteConfirm({ type: 'product', item })}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const materialColumns: Column<RawMaterial>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (item) => <span className="font-mono text-sm">{item.sku}</span>,
    },
    {
      key: 'name',
      header: 'Material',
      cell: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      cell: (item) => <Badge variant="outline">{item.unit}</Badge>,
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (item) => {
        const isLow = item.current_stock <= item.minimum_stock;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-medium text-destructive' : ''}>
              {item.current_stock}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        );
      },
    },
    {
      key: 'min',
      header: 'Min Level',
      cell: (item) => <span className="text-muted-foreground">{item.minimum_stock}</span>,
    },
    {
      key: 'reorder',
      header: 'Reorder Point',
      cell: (item) => <span className="text-muted-foreground">{item.reorder_point}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      cell: (item) => (
        <span className="font-medium">
          ${(Number(item.current_stock) * Number(item.cost_per_unit)).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditMaterial(item)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Stock
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteConfirm({ type: 'material', item })}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        description="Overview of your stock levels and inventory value."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inventory Value
            </CardTitle>
            <Warehouse className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Product Stock Value
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${productValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{products.length} products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Materials Value
            </CardTitle>
            <Boxes className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${materialValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{materials.length} materials</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {lowStockProducts.length + lowStockMaterials.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {lowStockProducts.length} products, {lowStockMaterials.length} materials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Tables */}
      <Tabs defaultValue="products" className="mt-8">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Finished Goods ({products.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Boxes className="h-4 w-4" />
            Raw Materials ({materials.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <DataTable
            columns={productColumns}
            data={products}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="No finished goods in inventory."
          />
        </TabsContent>
        <TabsContent value="materials" className="mt-4">
          <DataTable
            columns={materialColumns}
            data={materials}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="No raw materials in inventory."
          />
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Stock</DialogTitle>
            <DialogDescription>Update stock levels for {editingProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product_stock">Current Stock</Label>
              <Input
                id="product_stock"
                type="number"
                value={productFormData.current_stock}
                onChange={(e) => setProductFormData(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_min">Minimum Stock</Label>
              <Input
                id="product_min"
                type="number"
                value={productFormData.minimum_stock}
                onChange={(e) => setProductFormData(prev => ({ ...prev, minimum_stock: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button onClick={handleSaveProduct} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material Stock</DialogTitle>
            <DialogDescription>Update stock levels for {editingMaterial?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material_stock">Current Stock</Label>
              <Input
                id="material_stock"
                type="number"
                value={materialFormData.current_stock}
                onChange={(e) => setMaterialFormData(prev => ({ ...prev, current_stock: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material_min">Minimum Stock</Label>
              <Input
                id="material_min"
                type="number"
                value={materialFormData.minimum_stock}
                onChange={(e) => setMaterialFormData(prev => ({ ...prev, minimum_stock: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material_reorder">Reorder Point</Label>
              <Input
                id="material_reorder"
                type="number"
                value={materialFormData.reorder_point}
                onChange={(e) => setMaterialFormData(prev => ({ ...prev, reorder_point: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaterial(null)}>Cancel</Button>
            <Button onClick={handleSaveMaterial} disabled={updateMaterial.isPending}>
              {updateMaterial.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type === 'product' ? 'Product' : 'Material'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirm?.item && 'name' in deleteConfirm.item ? deleteConfirm.item.name : ''}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}