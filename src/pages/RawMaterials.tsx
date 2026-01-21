import { useState } from 'react';
import { useRawMaterials, useCreateRawMaterial, useUpdateRawMaterial, useDeleteRawMaterial } from '@/hooks/useRawMaterials';
import { useSuppliers } from '@/hooks/useSuppliers';
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
import { Boxes, Plus, MoreHorizontal, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react';
import type { RawMaterial, UnitOfMeasure, Supplier } from '@/types/erp';

const unitOptions: UnitOfMeasure[] = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'box', 'pack'];

const initialFormData = {
  sku: '',
  name: '',
  description: '',
  unit: 'pcs' as UnitOfMeasure,
  cost_per_unit: 0,
  minimum_stock: 0,
  current_stock: 0,
  reorder_point: 0,
  supplier_id: '',
};

export default function RawMaterials() {
  const { data: materials = [], isLoading } = useRawMaterials();
  const { data: suppliers = [] } = useSuppliers();
  const createMaterial = useCreateRawMaterial();
  const updateMaterial = useUpdateRawMaterial();
  const deleteMaterial = useDeleteRawMaterial();

  const [isOpen, setIsOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(true);

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingMaterial(null);
    setSelectedExistingId('');
    setIsAddingNew(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      sku: material.sku,
      name: material.name,
      description: material.description || '',
      unit: material.unit,
      cost_per_unit: Number(material.cost_per_unit),
      minimum_stock: Number(material.minimum_stock),
      current_stock: Number(material.current_stock),
      reorder_point: Number(material.reorder_point),
    });
    setIsAddingNew(true);
    setIsOpen(true);
  };

  const handleSelectExisting = (materialId: string) => {
    setSelectedExistingId(materialId);
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setFormData({
        sku: material.sku,
        name: material.name,
        description: material.description || '',
        unit: material.unit,
        cost_per_unit: Number(material.cost_per_unit),
        minimum_stock: Number(material.minimum_stock),
        current_stock: 0, // User will enter quantity to add
        reorder_point: Number(material.reorder_point),
      });
      setEditingMaterial(material);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMaterial) {
      // If adding stock to existing material
      if (selectedExistingId && !isAddingNew) {
        const existingMaterial = materials.find((m) => m.id === selectedExistingId);
        if (existingMaterial) {
          await updateMaterial.mutateAsync({
            id: selectedExistingId,
            current_stock: Number(existingMaterial.current_stock) + formData.current_stock,
            cost_per_unit: formData.cost_per_unit,
          });
        }
      } else {
        // Regular edit
        await updateMaterial.mutateAsync({
          id: editingMaterial.id,
          ...formData,
        });
      }
    } else {
      // Create new
      await createMaterial.mutateAsync(formData);
    }

    setIsOpen(false);
    resetForm();
  };

  const isSubmitting = createMaterial.isPending || updateMaterial.isPending;

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
            <DropdownMenuItem onClick={() => handleEdit(item)}>
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
        <EmptyState
          icon={Boxes}
          title="No raw materials yet"
          description="Add your first raw material to start tracking inventory."
          action={{
            label: 'Add Material',
            onClick: () => setIsOpen(true),
          }}
        />
        <MaterialDialog
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEditing={!!editingMaterial}
          materials={materials}
          selectedExistingId={selectedExistingId}
          onSelectExisting={handleSelectExisting}
          isAddingNew={isAddingNew}
          setIsAddingNew={setIsAddingNew}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Raw Materials"
        description="Manage your raw materials inventory."
        actions={
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </Button>
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

      <MaterialDialog
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isEditing={!!editingMaterial}
        materials={materials}
        selectedExistingId={selectedExistingId}
        onSelectExisting={handleSelectExisting}
        isAddingNew={isAddingNew}
        setIsAddingNew={setIsAddingNew}
      />
    </div>
  );
}

function MaterialDialog({
  isOpen,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  isEditing,
  materials,
  selectedExistingId,
  onSelectExisting,
  isAddingNew,
  setIsAddingNew,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: typeof initialFormData;
  setFormData: (data: typeof initialFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isEditing: boolean;
  materials: RawMaterial[];
  selectedExistingId: string;
  onSelectExisting: (id: string) => void;
  isAddingNew: boolean;
  setIsAddingNew: (adding: boolean) => void;
}) {
  const handleModeChange = (mode: 'new' | 'existing') => {
    setIsAddingNew(mode === 'new');
    if (mode === 'new') {
      setFormData(initialFormData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing && isAddingNew ? 'Edit Raw Material' : 'Add Raw Material'}</DialogTitle>
            <DialogDescription>
              {isEditing && isAddingNew 
                ? 'Update raw material details.' 
                : 'Add stock to existing material or create a new one.'}
            </DialogDescription>
          </DialogHeader>

          {/* Mode selector - only show when not editing */}
          {!isEditing && materials.length > 0 && (
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={isAddingNew ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('new')}
              >
                Create New
              </Button>
              <Button
                type="button"
                variant={!isAddingNew ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('existing')}
              >
                Add to Existing
              </Button>
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Existing material selector */}
            {!isAddingNew && materials.length > 0 && (
              <div className="space-y-2">
                <Label>Select Material</Label>
                <Select
                  value={selectedExistingId}
                  onValueChange={onSelectExisting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a material..." />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.sku}) - Current: {material.current_stock} {material.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show all fields for new material or editing */}
            {(isAddingNew || isEditing) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="MAT-001"
                      required
                      disabled={!isAddingNew && !!selectedExistingId}
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
                      disabled={!isAddingNew && !!selectedExistingId}
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
                    disabled={!isAddingNew && !!selectedExistingId}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value: UnitOfMeasure) => setFormData({ ...formData, unit: value })}
                      disabled={!isAddingNew && !!selectedExistingId}
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
                    <Label htmlFor="currentStock">
                      {isAddingNew ? 'Current Stock' : 'Quantity to Add'}
                    </Label>
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
                      disabled={!isAddingNew && !!selectedExistingId}
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
                      disabled={!isAddingNew && !!selectedExistingId}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Simplified form for adding to existing */}
            {!isAddingNew && selectedExistingId && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                <div className="text-sm">
                  <p className="font-medium">Selected: {formData.name}</p>
                  <p className="text-muted-foreground">Unit: {formData.unit} | Current Cost: ${formData.cost_per_unit}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addQty">Quantity to Add</Label>
                    <Input
                      id="addQty"
                      type="number"
                      min="0"
                      value={formData.current_stock}
                      onChange={(e) =>
                        setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })
                      }
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="updateCost">Update Cost (optional)</Label>
                    <Input
                      id="updateCost"
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
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (!isAddingNew && !selectedExistingId)}
            >
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Adding...') 
                : (isEditing && isAddingNew ? 'Update Material' : isAddingNew ? 'Create Material' : 'Add Stock')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
