import { useState } from 'react';
import { useProducts, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useRawMaterials, useUpdateRawMaterial, useDeleteRawMaterial } from '@/hooks/useRawMaterials';
import { useSemiFinishedGoods, useCreateSemiFinishedGood, useUpdateSemiFinishedGood, useDeleteSemiFinishedGood } from '@/hooks/useSemiFinishedGoods';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Warehouse, Package, Boxes, AlertTriangle, MoreHorizontal, Edit, Trash2, Plus, Clock } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { AssignedQuantityDialog } from '@/components/inventory/AssignedQuantityDialog';
import type { Product, RawMaterial } from '@/types/erp';
import type { SemiFinishedGood } from '@/hooks/useSemiFinishedGoods';
import { formatNumber, formatCurrency } from '@/lib/utils';

export default function Inventory() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: materials = [], isLoading: materialsLoading } = useRawMaterials();
  const { data: semiFinishedGoods = [], isLoading: semiFinishedLoading } = useSemiFinishedGoods();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateMaterial = useUpdateRawMaterial();
  const deleteMaterial = useDeleteRawMaterial();
  const createSemiFinished = useCreateSemiFinishedGood();
  const updateSemiFinished = useUpdateSemiFinishedGood();
  const deleteSemiFinished = useDeleteSemiFinishedGood();

  const isLoading = productsLoading || materialsLoading || semiFinishedLoading;

  // All products are shown in finished goods tab
  const finishedGoods = products;

  // Edit/delete state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [editingSemiFinished, setEditingSemiFinished] = useState<SemiFinishedGood | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'product' | 'material' | 'semi'; item: Product | RawMaterial | SemiFinishedGood } | null>(null);
  const [productFormData, setProductFormData] = useState({ current_stock: 0, minimum_stock: 0, assigned_quantity: 0 });
  const [materialFormData, setMaterialFormData] = useState({ current_stock: 0, purchasing_quantity: 0, reorder_point: 0 });
  const [assignedDialog, setAssignedDialog] = useState<{ productId: string; productName: string; quantity: number } | null>(null);
  
  // Semi-finished goods dialog state
  const [isAddSemiFinishedOpen, setIsAddSemiFinishedOpen] = useState(false);
  const [semiFinishedFormData, setSemiFinishedFormData] = useState({
    product_id: '',
    quantity: 1,
    missing_items: '',
    notes: '',
  });

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
  const lowStockMaterials = materials.filter((m) => m.current_stock <= m.reorder_point);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({ 
      current_stock: product.current_stock, 
      minimum_stock: product.minimum_stock, 
      assigned_quantity: (product as Product & { assigned_quantity?: number }).assigned_quantity || 0
    });
  };

  const handleEditMaterial = (material: RawMaterial) => {
    setEditingMaterial(material);
    setMaterialFormData({ 
      current_stock: material.current_stock, 
      purchasing_quantity: material.purchasing_quantity,
      reorder_point: material.reorder_point 
    });
  };

  const handleEditSemiFinished = (item: SemiFinishedGood) => {
    setEditingSemiFinished(item);
    setSemiFinishedFormData({
      product_id: item.product_id,
      quantity: item.quantity,
      missing_items: item.missing_items,
      notes: item.notes || '',
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

  const handleSaveSemiFinished = async () => {
    if (editingSemiFinished) {
      await updateSemiFinished.mutateAsync({ 
        id: editingSemiFinished.id, 
        ...semiFinishedFormData 
      });
      setEditingSemiFinished(null);
    }
  };

  const handleAddSemiFinished = async () => {
    if (!semiFinishedFormData.product_id || !semiFinishedFormData.missing_items) return;
    await createSemiFinished.mutateAsync(semiFinishedFormData);
    setIsAddSemiFinishedOpen(false);
    setSemiFinishedFormData({ product_id: '', quantity: 1, missing_items: '', notes: '' });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'product') {
      await deleteProduct.mutateAsync(deleteConfirm.item.id);
    } else if (deleteConfirm.type === 'material') {
      await deleteMaterial.mutateAsync(deleteConfirm.item.id);
    } else if (deleteConfirm.type === 'semi') {
      await deleteSemiFinished.mutateAsync(deleteConfirm.item.id);
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
      key: 'stock',
      header: 'Stock',
      cell: (item) => {
        const isLow = item.current_stock <= item.minimum_stock;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-medium text-destructive' : ''}>
              {formatNumber(item.current_stock)} {item.unit}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        );
      },
    },
    {
      key: 'min',
      header: 'Min Level',
      cell: (item) => <span className="text-muted-foreground">{formatNumber(item.minimum_stock)}</span>,
    },
    {
      key: 'assigned_quantity',
      header: 'Assigned Qty',
      cell: (item) => {
        const assignedQty = (item as Product & { assigned_quantity?: number }).assigned_quantity || 0;
        return assignedQty > 0 ? (
          <button
            className="font-medium text-primary hover:underline cursor-pointer"
            onClick={() => setAssignedDialog({ productId: item.id, productName: item.name, quantity: assignedQty })}
          >
            {formatNumber(assignedQty)}
          </button>
        ) : (
          <span className="text-muted-foreground">0</span>
        );
      },
    },
    {
      key: 'value',
      header: 'Value',
      cell: (item) => (
        <span className="font-medium">
          {formatCurrency(Number(item.current_stock) * Number(item.selling_price))}
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
        const isLow = item.current_stock <= item.reorder_point;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-medium text-destructive' : ''}>
              {formatNumber(item.current_stock)}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        );
      },
    },
    {
      key: 'purchasing_qty',
      header: 'Purchasing Qty',
      cell: (item) => <span className="text-muted-foreground">{formatNumber(item.purchasing_quantity)}</span>,
    },
    {
      key: 'reorder',
      header: 'Reorder Point',
      cell: (item) => <span className="text-muted-foreground">{formatNumber(item.reorder_point)}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      cell: (item) => (
        <span className="font-medium">
          {formatCurrency(Number(item.current_stock) * Number(item.cost_per_unit))}
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

  const semiFinishedColumns: Column<SemiFinishedGood>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (item) => <span className="font-medium">{item.product?.name || 'Unknown'}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      cell: (item) => <span>{formatNumber(item.quantity)}</span>,
    },
    {
      key: 'missing_items',
      header: 'What is Missing',
      cell: (item) => (
        <span className="text-destructive font-medium">{item.missing_items}</span>
      ),
    },
    {
      key: 'mo',
      header: 'MO',
      cell: (item) => item.manufacturing_order ? (
        <Badge variant="outline">{(item.manufacturing_order as any).mo_number}</Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (item) => <span className="text-muted-foreground text-sm">{item.notes || '-'}</span>,
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
            <DropdownMenuItem onClick={() => handleEditSemiFinished(item)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteConfirm({ type: 'semi', item })}
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
            <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
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
            <div className="text-3xl font-bold">{formatCurrency(productValue)}</div>
            <p className="text-xs text-muted-foreground">{formatNumber(products.length)} products</p>
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
            <div className="text-3xl font-bold">{formatCurrency(materialValue)}</div>
            <p className="text-xs text-muted-foreground">{formatNumber(materials.length)} materials</p>
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
              {formatNumber(lowStockProducts.length + lowStockMaterials.length)}
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
            Finished Goods ({finishedGoods.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Boxes className="h-4 w-4" />
            Raw Materials ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="semi-finished" className="gap-2">
            <Clock className="h-4 w-4" />
            Semi-Finished ({semiFinishedGoods.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <DataTable
            columns={productColumns}
            data={finishedGoods}
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
        <TabsContent value="semi-finished" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsAddSemiFinishedOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Semi-Finished
            </Button>
          </div>
          <DataTable
            columns={semiFinishedColumns}
            data={semiFinishedGoods}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="No semi-finished goods. These are products that are partially complete and missing components."
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
              <Label htmlFor="material_purchasing_qty">Purchasing Quantity</Label>
              <Input
                id="material_purchasing_qty"
                type="number"
                value={materialFormData.purchasing_quantity}
                onChange={(e) => setMaterialFormData(prev => ({ ...prev, purchasing_quantity: Number(e.target.value) }))}
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

      {/* Add Semi-Finished Dialog */}
      <Dialog open={isAddSemiFinishedOpen} onOpenChange={setIsAddSemiFinishedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Semi-Finished Good</DialogTitle>
            <DialogDescription>Track a product that is partially complete and missing components.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sf_product">Product *</Label>
              <Select 
                value={semiFinishedFormData.product_id} 
                onValueChange={(v) => setSemiFinishedFormData(prev => ({ ...prev, product_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_quantity">Quantity</Label>
              <Input
                id="sf_quantity"
                type="number"
                min={1}
                value={semiFinishedFormData.quantity}
                onChange={(e) => setSemiFinishedFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_missing">What is Missing *</Label>
              <Textarea
                id="sf_missing"
                placeholder="Describe what components or materials are missing..."
                value={semiFinishedFormData.missing_items}
                onChange={(e) => setSemiFinishedFormData(prev => ({ ...prev, missing_items: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_notes">Notes</Label>
              <Textarea
                id="sf_notes"
                placeholder="Additional notes..."
                value={semiFinishedFormData.notes}
                onChange={(e) => setSemiFinishedFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSemiFinishedOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddSemiFinished} 
              disabled={createSemiFinished.isPending || !semiFinishedFormData.product_id || !semiFinishedFormData.missing_items}
            >
              {createSemiFinished.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Semi-Finished Dialog */}
      <Dialog open={!!editingSemiFinished} onOpenChange={() => setEditingSemiFinished(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Semi-Finished Good</DialogTitle>
            <DialogDescription>Update the semi-finished good details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_sf_quantity">Quantity</Label>
              <Input
                id="edit_sf_quantity"
                type="number"
                min={1}
                value={semiFinishedFormData.quantity}
                onChange={(e) => setSemiFinishedFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_sf_missing">What is Missing *</Label>
              <Textarea
                id="edit_sf_missing"
                placeholder="Describe what components or materials are missing..."
                value={semiFinishedFormData.missing_items}
                onChange={(e) => setSemiFinishedFormData(prev => ({ ...prev, missing_items: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_sf_notes">Notes</Label>
              <Textarea
                id="edit_sf_notes"
                placeholder="Additional notes..."
                value={semiFinishedFormData.notes}
                onChange={(e) => setSemiFinishedFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSemiFinished(null)}>Cancel</Button>
            <Button 
              onClick={handleSaveSemiFinished} 
              disabled={updateSemiFinished.isPending || !semiFinishedFormData.missing_items}
            >
              {updateSemiFinished.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteConfirm?.type === 'product' ? 'Product' : deleteConfirm?.type === 'material' ? 'Material' : 'Semi-Finished Good'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this item. This action cannot be undone.
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

      {/* Assigned Quantity Dialog */}
      {assignedDialog && (
        <AssignedQuantityDialog
          open={!!assignedDialog}
          onOpenChange={() => setAssignedDialog(null)}
          productId={assignedDialog.productId}
          productName={assignedDialog.productName}
          assignedQuantity={assignedDialog.quantity}
        />
      )}
    </div>
  );
}
