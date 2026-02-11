import { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useBulkCreateProducts } from '@/hooks/useProducts';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import { useCreateProductMaterials, useUpdateProductMaterials, useProductMaterials } from '@/hooks/useProductMaterials';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExcelUpload, ColumnMapping } from '@/components/upload/ExcelUpload';
import { Package, Plus, MoreHorizontal, Pencil, Trash2, Search, PlusCircle, Upload } from 'lucide-react';
import { HybridMaterialsForm, MaterialLine } from '@/components/products/HybridMaterialsForm';
import { ProductBomDialog } from '@/components/products/ProductBomDialog';
import type { Product, ProductType, UnitOfMeasure, Category } from '@/types/erp';

const unitOptions: UnitOfMeasure[] = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'box', 'pack'];

const excelColumns: ColumnMapping[] = [
  { key: 'sku', label: 'SKU', required: true, type: 'string' },
  { key: 'name', label: 'Name', required: true, type: 'string' },
  { key: 'description', label: 'Description', required: false, type: 'string' },
  { key: 'product_type', label: 'Product Type', required: true, type: 'string' },
  { key: 'unit', label: 'Unit', required: true, type: 'string' },
  { key: 'selling_price', label: 'Selling Price', required: true, type: 'number' },
  { key: 'cost_price', label: 'Cost Price', required: false, type: 'number' },
  { key: 'manufacturing_time_minutes', label: 'Mfg Time (min)', required: false, type: 'number' },
  { key: 'minimum_stock', label: 'Minimum Stock', required: false, type: 'number' },
  { key: 'current_stock', label: 'Current Stock', required: false, type: 'number' },
];

const initialFormData = {
  sku: '',
  name: '',
  description: '',
  category_id: '',
  product_type: 'in_house' as ProductType,
  unit: 'pcs' as UnitOfMeasure,
  selling_price: 0,
  cost_price: 0,
  manufacturing_time_minutes: 60,
  minimum_stock: 0,
  current_stock: 0,
};

export default function Products() {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();
  const createMaterials = useCreateProductMaterials();
  const updateMaterials = useUpdateProductMaterials();
  const bulkCreate = useBulkCreateProducts();

  const [isOpen, setIsOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(Product & { category: Category | null }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [hybridMaterials, setHybridMaterials] = useState<MaterialLine[]>([]);
  const [bomDialog, setBomDialog] = useState<{ productId: string; productName: string } | null>(null);

  // Fetch materials when editing a hybrid product
  const { data: existingMaterials = [] } = useProductMaterials(editingProduct?.id || '');

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.product_type.toLowerCase().includes(q) ||
      p.unit.toLowerCase().includes(q) ||
      String(p.selling_price).includes(q) ||
      String(p.current_stock).includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProduct(null);
    setNewCategoryName('');
    setIsAddingCategory(false);
    setHybridMaterials([]);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleEdit = (product: Product & { category: Category | null }) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      product_type: product.product_type,
      unit: product.unit,
      selling_price: Number(product.selling_price),
      cost_price: Number(product.cost_price),
      manufacturing_time_minutes: product.manufacturing_time_minutes,
      minimum_stock: Number(product.minimum_stock),
      current_stock: Number(product.current_stock),
    });
    setIsOpen(true);
  };

  // Load existing materials when editing
  const handleEditWithMaterials = (product: Product & { category: Category | null }) => {
    handleEdit(product);
    // Materials will be loaded via the useProductMaterials hook when the dialog opens
  };

  // Effect to load materials when editing
  useState(() => {
    if (editingProduct?.product_type === 'hybrid' && existingMaterials.length > 0) {
      setHybridMaterials(existingMaterials.map(m => ({
        raw_material_id: m.raw_material_id,
        quantity: m.quantity,
        source_type: m.source_type,
      })));
    }
  });

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const result = await createCategory.mutateAsync({ name: newCategoryName.trim() });
    if (result?.id) {
      setFormData({ ...formData, category_id: result.id });
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate hybrid products have at least one material
    if (formData.product_type === 'hybrid' && hybridMaterials.length === 0) {
      return; // Show error or prevent submission
    }

    // Validate all material lines have a raw_material_id
    if (formData.product_type === 'hybrid' && hybridMaterials.some(m => !m.raw_material_id)) {
      return;
    }
    
    if (editingProduct) {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        ...formData,
        category_id: formData.category_id || undefined,
      });

      // Update materials if hybrid
      if (formData.product_type === 'hybrid') {
        await updateMaterials.mutateAsync({
          productId: editingProduct.id,
          materials: hybridMaterials.map(m => ({
            product_id: editingProduct.id,
            raw_material_id: m.raw_material_id,
            quantity: m.quantity,
            source_type: m.source_type,
          })),
        });
      }
    } else {
      const newProduct = await createProduct.mutateAsync({
        ...formData,
        category_id: formData.category_id || undefined,
      });

      // Save materials if hybrid
      if (formData.product_type === 'hybrid' && newProduct?.id && hybridMaterials.length > 0) {
        await createMaterials.mutateAsync(
          hybridMaterials.map(m => ({
            product_id: newProduct.id,
            raw_material_id: m.raw_material_id,
            quantity: m.quantity,
            source_type: m.source_type,
          }))
        );
      }
    }
    
    setIsOpen(false);
    resetForm();
  };

  const handleExcelUpload = async (data: Record<string, unknown>[]) => {
    const items = data.map((row) => ({
      sku: String(row.sku || ''),
      name: String(row.name || ''),
      description: row.description ? String(row.description) : undefined,
      product_type: (row.product_type as ProductType) || 'in_house',
      unit: (row.unit as UnitOfMeasure) || 'pcs',
      selling_price: Number(row.selling_price) || 0,
      cost_price: Number(row.cost_price) || 0,
      manufacturing_time_minutes: Number(row.manufacturing_time_minutes) || 60,
      minimum_stock: Number(row.minimum_stock) || 0,
      current_stock: Number(row.current_stock) || 0,
    }));
    await bulkCreate.mutateAsync(items);
  };

  const isSubmitting = createProduct.isPending || updateProduct.isPending || createMaterials.isPending || updateMaterials.isPending;

  const columns: Column<Product & { category: Category | null }>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (item) => <span className="font-mono text-sm">{item.sku}</span>,
    },
    {
      key: 'name',
      header: 'Product Name',
      cell: (item) => (
        <div>
          <button
            className="font-medium text-primary hover:underline cursor-pointer text-left"
            onClick={() => setBomDialog({ productId: item.id, productName: item.name })}
          >
            {item.name}
          </button>
          {item.category && (
            <p className="text-xs text-muted-foreground">{item.category.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (item) => {
        const typeLabels: Record<string, string> = { in_house: 'In-House', outsourced: 'Outsourced', hybrid: 'Hybrid' };
        return (
        <Badge variant={item.product_type === 'in_house' ? 'default' : 'secondary'}>
          {typeLabels[item.product_type] || item.product_type}
        </Badge>
      );},
    },
    {
      key: 'price',
      header: 'Price',
      cell: (item) => (
        <div>
          <p className="font-medium">${Number(item.selling_price).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Cost: ${Number(item.cost_price).toFixed(2)}</p>
        </div>
      ),
    },
    {
      key: 'profit',
      header: 'Profit',
      cell: (item) => {
        const profit = Number(item.selling_price) - Number(item.cost_price);
        const margin = item.selling_price > 0 ? (profit / Number(item.selling_price)) * 100 : 0;
        return (
          <div>
            <p className={profit >= 0 ? 'text-green-600' : 'text-destructive'}>${profit.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{margin.toFixed(1)}%</p>
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span
            className={
              item.current_stock <= item.minimum_stock
                ? 'font-medium text-destructive'
                : ''
            }
          >
            {item.current_stock} {item.unit}
          </span>
          {item.current_stock <= item.minimum_stock && (
            <Badge variant="destructive" className="text-xs">Low</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditWithMaterials(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteProduct.mutate(item.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  if (!isLoading && products.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Products" description="Manage your product catalog and BOMs." />
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Create your first product to start managing your manufacturing operations."
          action={{
            label: 'Add Product',
            onClick: () => setIsOpen(true),
          }}
        />
        <ProductDialog
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEditing={!!editingProduct}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          isAddingCategory={isAddingCategory}
          setIsAddingCategory={setIsAddingCategory}
          onAddCategory={handleAddCategory}
          isCreatingCategory={createCategory.isPending}
          hybridMaterials={hybridMaterials}
          setHybridMaterials={setHybridMaterials}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Products"
        description="Manage your product catalog and BOMs."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsExcelOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No products found matching your search."
      />

      <ProductDialog
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isEditing={!!editingProduct}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        isAddingCategory={isAddingCategory}
        setIsAddingCategory={setIsAddingCategory}
        onAddCategory={handleAddCategory}
        isCreatingCategory={createCategory.isPending}
        hybridMaterials={hybridMaterials}
        setHybridMaterials={setHybridMaterials}
      />

      <ExcelUpload
        title="Import Products"
        columns={excelColumns}
        templateFileName="products_template"
        onUpload={handleExcelUpload}
        isOpen={isExcelOpen}
        onOpenChange={setIsExcelOpen}
      />

      {bomDialog && (
        <ProductBomDialog
          open={!!bomDialog}
          onOpenChange={(open) => !open && setBomDialog(null)}
          productId={bomDialog.productId}
          productName={bomDialog.productName}
        />
      )}
    </div>
  );
}

function ProductDialog({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  categories,
  onSubmit,
  isSubmitting,
  isEditing,
  newCategoryName,
  setNewCategoryName,
  isAddingCategory,
  setIsAddingCategory,
  onAddCategory,
  isCreatingCategory,
  hybridMaterials,
  setHybridMaterials,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: typeof initialFormData;
  setFormData: (data: typeof initialFormData) => void;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isEditing: boolean;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  isAddingCategory: boolean;
  setIsAddingCategory: (adding: boolean) => void;
  onAddCategory: () => void;
  isCreatingCategory: boolean;
  hybridMaterials: MaterialLine[];
  setHybridMaterials: (materials: MaterialLine[]) => void;
}) {
  const isHybrid = formData.product_type === 'hybrid';
  const isHybridValid = !isHybrid || (hybridMaterials.length > 0 && hybridMaterials.every(m => m.raw_material_id));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update product details.' : 'Create a new product for your catalog.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-sku">SKU *</Label>
                <Input
                  id="dialog-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="PROD-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-name">Product Name *</Label>
                <Input
                  id="dialog-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Widget Pro"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-description">Description</Label>
              <Textarea
                id="dialog-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={onAddCategory}
                      disabled={isCreatingCategory || !newCategoryName.trim()}
                    >
                      {isCreatingCategory ? '...' : 'Add'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setIsAddingCategory(true)}
                      title="Add new category"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-type">Product Type *</Label>
                <Select
                  value={formData.product_type}
                  onValueChange={(value: ProductType) => {
                    setFormData({ ...formData, product_type: value });
                    // Reset materials when switching away from hybrid
                    if (value !== 'hybrid') {
                      setHybridMaterials([]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_house">In-House</SelectItem>
                    <SelectItem value="outsourced">Outsourced</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hybrid Materials Form */}
            {isHybrid && (
              <HybridMaterialsForm
                materials={hybridMaterials}
                onChange={setHybridMaterials}
              />
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value: UnitOfMeasure) =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-cost">Cost Price ($)</Label>
                <Input
                  id="dialog-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-price">Selling Price ($)</Label>
                <Input
                  id="dialog-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price}
                  onChange={(e) =>
                    setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-time">Mfg. Time (min)</Label>
                <Input
                  id="dialog-time"
                  type="number"
                  min="0"
                  value={formData.manufacturing_time_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      manufacturing_time_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-minStock">Minimum Stock</Label>
                <Input
                  id="dialog-minStock"
                  type="number"
                  min="0"
                  value={formData.minimum_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-currentStock">Current Stock</Label>
                <Input
                  id="dialog-currentStock"
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isHybridValid}>
              {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Product' : 'Create Product')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
