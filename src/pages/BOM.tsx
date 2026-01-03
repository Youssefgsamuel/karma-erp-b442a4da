import { useState } from 'react';
import { useBomItems, useCreateBomItem, useDeleteBomItem } from '@/hooks/useBOM';
import { useProducts } from '@/hooks/useProducts';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
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
import { ClipboardList, Plus, MoreHorizontal, Trash2, Search } from 'lucide-react';
import type { BomItemWithDetails } from '@/hooks/useBOM';

export default function BOM() {
  const { data: bomItems = [], isLoading } = useBomItems();
  const { data: products = [] } = useProducts();
  const { data: rawMaterials = [] } = useRawMaterials();
  const createBomItem = useCreateBomItem();
  const deleteBomItem = useDeleteBomItem();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    raw_material_id: '',
    quantity: 1,
    notes: '',
  });

  const filteredBomItems = bomItems.filter(
    (item) =>
      item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.raw_material?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBomItem.mutateAsync({
      product_id: formData.product_id,
      raw_material_id: formData.raw_material_id,
      quantity: formData.quantity,
      notes: formData.notes || undefined,
    });
    setIsOpen(false);
    setFormData({
      product_id: '',
      raw_material_id: '',
      quantity: 1,
      notes: '',
    });
  };

  const selectedMaterial = rawMaterials.find(m => m.id === formData.raw_material_id);

  const columns: Column<BomItemWithDetails>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (item) => (
        <div>
          <p className="font-medium">{item.product?.name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'raw_material',
      header: 'Raw Material',
      cell: (item) => (
        <div>
          <p className="font-medium">{item.raw_material?.name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{item.raw_material?.sku}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity Required',
      cell: (item) => (
        <span>
          {item.quantity} {item.raw_material?.unit}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Material Cost',
      cell: (item) => {
        const cost = Number(item.quantity) * Number(item.raw_material?.cost_per_unit || 0);
        return <span>${cost.toFixed(2)}</span>;
      },
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (item) => (
        <span className="text-muted-foreground text-sm">{item.notes || '—'}</span>
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteBomItem.mutate(item.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  const dialogContent = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add BOM Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add BOM Item</DialogTitle>
            <DialogDescription>
              Define a raw material requirement for a product.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Raw Material *</Label>
              <Select
                value={formData.raw_material_id}
                onValueChange={(value) => setFormData({ ...formData, raw_material_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a raw material" />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.sku}) - ${Number(material.cost_per_unit).toFixed(2)}/{material.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity Required {selectedMaterial && `(${selectedMaterial.unit})`} *
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 1 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this material requirement..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createBomItem.isPending || !formData.product_id || !formData.raw_material_id}
            >
              {createBomItem.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (!isLoading && bomItems.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Bill of Materials"
          description="Define product compositions and material requirements."
        />
        <EmptyState
          icon={ClipboardList}
          title="No BOM items yet"
          description="Define raw material requirements for your products to calculate manufacturing costs."
          action={{
            label: 'Add BOM Item',
            onClick: () => setIsOpen(true),
          }}
        />
        {dialogContent}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bill of Materials"
        description="Define product compositions and material requirements."
        actions={dialogContent}
      />

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product or material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredBomItems}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No BOM items found matching your search."
      />
    </div>
  );
}
