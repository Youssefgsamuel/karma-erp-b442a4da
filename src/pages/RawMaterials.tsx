import { useState } from 'react';
import { useRawMaterials, useCreateRawMaterial, useDeleteRawMaterial } from '@/hooks/useRawMaterials';
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
import { Boxes, Plus, MoreHorizontal, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react';
import type { RawMaterial, UnitOfMeasure } from '@/types/erp';

const unitOptions: UnitOfMeasure[] = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'box', 'pack'];

export default function RawMaterials() {
  const { data: materials = [], isLoading } = useRawMaterials();
  const createMaterial = useCreateRawMaterial();
  const deleteMaterial = useDeleteRawMaterial();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    unit: 'pcs' as UnitOfMeasure,
    cost_per_unit: 0,
    minimum_stock: 0,
    current_stock: 0,
    reorder_point: 0,
  });

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMaterial.mutateAsync(formData);
    setIsOpen(false);
    setFormData({
      sku: '',
      name: '',
      description: '',
      unit: 'pcs',
      cost_per_unit: 0,
      minimum_stock: 0,
      current_stock: 0,
      reorder_point: 0,
    });
  };

  const columns: Column<RawMaterial>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (item) => <span className="font-mono text-sm">{item.sku}</span>,
    },
    {
      key: 'name',
      header: 'Material Name',
      cell: (item) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      cell: (item) => <Badge variant="outline">{item.unit}</Badge>,
    },
    {
      key: 'cost',
      header: 'Cost/Unit',
      cell: (item) => <span>${Number(item.cost_per_unit).toFixed(2)}</span>,
    },
    {
      key: 'stock',
      header: 'Current Stock',
      cell: (item) => {
        const isLow = item.current_stock <= item.minimum_stock;
        const isReorder = item.current_stock <= item.reorder_point;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-medium text-destructive' : ''}>
              {item.current_stock} {item.unit}
            </span>
            {isLow && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Low
              </Badge>
            )}
            {!isLow && isReorder && (
              <Badge variant="outline" className="erp-badge-warning text-xs">
                Reorder
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'minStock',
      header: 'Min Stock',
      cell: (item) => <span className="text-muted-foreground">{item.minimum_stock}</span>,
    },
    {
      key: 'value',
      header: 'Total Value',
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
              onClick={() => deleteMaterial.mutate(item.id)}
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

  if (!isLoading && materials.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Raw Materials" description="Manage your raw materials inventory." />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <EmptyState
            icon={Boxes}
            title="No raw materials yet"
            description="Add your first raw material to start tracking inventory."
            action={{
              label: 'Add Material',
              onClick: () => setIsOpen(true),
            }}
          />
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add Raw Material</DialogTitle>
                <DialogDescription>
                  Add a new raw material to your inventory.
                </DialogDescription>
              </DialogHeader>
              <MaterialForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMaterial.isPending}>
                  {createMaterial.isPending ? 'Creating...' : 'Add Material'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Raw Materials"
        description="Manage your raw materials inventory."
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Raw Material</DialogTitle>
                  <DialogDescription>
                    Add a new raw material to your inventory.
                  </DialogDescription>
                </DialogHeader>
                <MaterialForm formData={formData} setFormData={setFormData} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMaterial.isPending}>
                    {createMaterial.isPending ? 'Creating...' : 'Add Material'}
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
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredMaterials}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No materials found matching your search."
      />
    </div>
  );
}

function MaterialForm({
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: (data: any) => void;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="MAT-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Material Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Steel Sheet"
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
          placeholder="Material description..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Select
            value={formData.unit}
            onValueChange={(value: UnitOfMeasure) => setFormData({ ...formData, unit: value })}
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
          <Label htmlFor="cost">Cost per Unit ($)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost_per_unit}
            onChange={(e) =>
              setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
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
          <Label htmlFor="reorderPoint">Reorder Point</Label>
          <Input
            id="reorderPoint"
            type="number"
            min="0"
            value={formData.reorder_point}
            onChange={(e) =>
              setFormData({ ...formData, reorder_point: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>
    </div>
  );
}
