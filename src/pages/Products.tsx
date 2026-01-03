import { useState } from 'react';
import { useProducts, useCreateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
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
  DialogTrigger,
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
import { Package, Plus, MoreHorizontal, Pencil, Trash2, Search } from 'lucide-react';
import type { Product, ProductType, UnitOfMeasure, Category } from '@/types/erp';

const unitOptions: UnitOfMeasure[] = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'box', 'pack'];

export default function Products() {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    product_type: 'in_house' as ProductType,
    unit: 'pcs' as UnitOfMeasure,
    selling_price: 0,
    manufacturing_time_minutes: 60,
    minimum_stock: 0,
    current_stock: 0,
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct.mutateAsync({
      ...formData,
      category_id: formData.category_id || undefined,
    });
    setIsOpen(false);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      product_type: 'in_house',
      unit: 'pcs',
      selling_price: 0,
      manufacturing_time_minutes: 60,
      minimum_stock: 0,
      current_stock: 0,
    });
  };

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
          <p className="font-medium">{item.name}</p>
          {item.category && (
            <p className="text-xs text-muted-foreground">{item.category.name}</p>
          )}
        </div>
      ),
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
      key: 'price',
      header: 'Selling Price',
      cell: (item) => <span>${Number(item.selling_price).toFixed(2)}</span>,
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
            <DropdownMenuItem>
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
          onOpenChange={setIsOpen}
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          onSubmit={handleSubmit}
          isSubmitting={createProduct.isPending}
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
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Create a new product for your catalog.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="PROD-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Widget Pro"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Product description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Product Type *</Label>
                      <Select
                        value={formData.product_type}
                        onValueChange={(value: ProductType) =>
                          setFormData({ ...formData, product_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_house">In-House</SelectItem>
                          <SelectItem value="outsourced">Outsourced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
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
                      <Label htmlFor="price">Selling Price ($)</Label>
                      <Input
                        id="price"
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
                      <Label htmlFor="time">Mfg. Time (min)</Label>
                      <Input
                        id="time"
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
                      <Label htmlFor="minStock">Minimum Stock</Label>
                      <Input
                        id="minStock"
                        type="number"
                        min="0"
                        value={formData.minimum_stock}
                        onChange={(e) =>
                          setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentStock">Current Stock</Label>
                      <Input
                        id="currentStock"
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
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProduct.isPending}>
                    {createProduct.isPending ? 'Creating...' : 'Create Product'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: any;
  setFormData: (data: any) => void;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          {/* Form content same as above */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
