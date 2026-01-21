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
  const [selectedProductId, setSelectedProductId] = useState('');
  const [materials, setMaterials] = useState([
    { raw_material_id: '', quantity: 1, notes: '' }
  ]);

  const filteredBomItems = bomItems.filter(
    (item) =>
      item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.raw_material?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMaterial = () => {
    setMaterials(prev => [...prev, { raw_material_id: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string | number) => {
    setMaterials(prev => prev.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create all BOM items
    for (const material of materials) {
      if (material.raw_material_id) {
        await createBomItem.mutateAsync({
          product_id: selectedProductId,
          raw_material_id: material.raw_material_id,
          quantity: material.quantity,
          notes: material.notes || undefined,
        });
      }
    }
    
    setIsOpen(false);
    setSelectedProductId('');
    setMaterials([{ raw_material_id: '', quantity: 1, notes: '' }]);
  };

  const validMaterials = materials.filter(m => m.raw_material_id);
  const totalMaterialCost = validMaterials.reduce((sum, m) => {
    const material = rawMaterials.find(rm => rm.id === m.raw_material_id);
    return sum + (m.quantity * Number(material?.cost_per_unit || 0));
  }, 0);

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
          Add BOM Items
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add BOM Items</DialogTitle>
            <DialogDescription>
              Add multiple raw materials to a product's bill of materials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
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
              <div className="flex items-center justify-between">
                <Label>Raw Materials *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMaterial}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Material
                </Button>
              </div>
              
              <div className="space-y-3">
                {materials.map((material, index) => {
                  const selectedMaterial = rawMaterials.find(m => m.id === material.raw_material_id);
                  return (
                    <div key={index} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 space-y-2">
                        <Select
                          value={material.raw_material_id}
                          onValueChange={(value) => handleMaterialChange(index, 'raw_material_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select raw material" />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((rm) => (
                              <SelectItem key={rm.id} value={rm.id}>
                                {rm.name} ({rm.sku}) - ${Number(rm.cost_per_unit).toFixed(2)}/{rm.unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Qty"
                          value={material.quantity}
                          onChange={(e) => handleMaterialChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                        {selectedMaterial && (
                          <span className="text-xs text-muted-foreground">{selectedMaterial.unit}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Notes (optional)"
                          value={material.notes}
                          onChange={(e) => handleMaterialChange(index, 'notes', e.target.value)}
                        />
                      </div>
                      {materials.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveMaterial(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {validMaterials.length > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium">
                  Total Material Cost: <span className="text-primary">${totalMaterialCost.toFixed(2)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {validMaterials.length} material(s) selected
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createBomItem.isPending || !selectedProductId || validMaterials.length === 0}
            >
              {createBomItem.isPending ? 'Adding...' : `Add ${validMaterials.length} Item(s)`}
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
