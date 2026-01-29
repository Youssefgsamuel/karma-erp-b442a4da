import { useState } from 'react';
import { useRawMaterials, useCreateRawMaterial, useUpdateRawMaterial, useDeleteRawMaterial, useBulkCreateRawMaterials } from '@/hooks/useRawMaterials';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useRawMaterialCategories, useCreateRawMaterialCategory } from '@/hooks/useRawMaterialCategories';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { TransactionHistoryDialog } from '@/components/raw-materials/TransactionHistoryDialog';
import { Boxes, Plus, MoreHorizontal, Pencil, Trash2, Search, AlertTriangle, Upload, History, PlusCircle } from 'lucide-react';
import type { RawMaterial, UnitOfMeasure, Supplier, RawMaterialCategory } from '@/types/erp';

const unitOptions: UnitOfMeasure[] = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'mm', 'box', 'pack'];

const initialFormData = {
  sku: '',
  name: '',
  description: '',
  unit: 'pcs' as UnitOfMeasure,
  cost_per_unit: 0,
  purchasing_quantity: 0,
  current_stock: 0,
  reorder_point: 0,
  supplier_id: '',
  category_id: '',
  is_for_sale: false,
};

const excelColumns: ColumnMapping[] = [
  { key: 'sku', label: 'SKU', required: true, type: 'string' },
  { key: 'name', label: 'Name', required: true, type: 'string' },
  { key: 'description', label: 'Description', required: false, type: 'string' },
  { key: 'unit', label: 'Unit', required: true, type: 'string' },
  { key: 'cost_per_unit', label: 'Cost Per Unit', required: true, type: 'number' },
  { key: 'purchasing_quantity', label: 'Purchasing Quantity', required: false, type: 'number' },
  { key: 'current_stock', label: 'Current Stock', required: false, type: 'number' },
  { key: 'reorder_point', label: 'Reorder Point', required: false, type: 'number' },
  { key: 'is_for_sale', label: 'For Sale', required: false, type: 'boolean' },
];

export default function RawMaterials() {
  const { data: materials = [], isLoading } = useRawMaterials();
  const { data: suppliers = [] } = useSuppliers();
  const { data: categories = [] } = useRawMaterialCategories();
  const createMaterial = useCreateRawMaterial();
  const updateMaterial = useUpdateRawMaterial();
  const deleteMaterial = useDeleteRawMaterial();
  const bulkCreate = useBulkCreateRawMaterials();
  const createCategory = useCreateRawMaterialCategory();

  const [isOpen, setIsOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(true);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Transaction history
  const [historyMaterial, setHistoryMaterial] = useState<RawMaterial | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
    setIsAddingCategory(false);
    setNewCategoryName('');
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
      purchasing_quantity: Number(material.purchasing_quantity),
      current_stock: Number(material.current_stock),
      reorder_point: Number(material.reorder_point),
      supplier_id: material.supplier_id || '',
      category_id: material.category_id || '',
      is_for_sale: material.is_for_sale || false,
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
        purchasing_quantity: Number(material.purchasing_quantity),
        current_stock: 0,
        reorder_point: Number(material.reorder_point),
        supplier_id: material.supplier_id || '',
        category_id: material.category_id || '',
        is_for_sale: material.is_for_sale || false,
      });
      setEditingMaterial(material);
    }
  };

  const handleShowHistory = (material: RawMaterial) => {
    setHistoryMaterial(material);
    setIsHistoryOpen(true);
  };

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

    if (editingMaterial) {
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
        await updateMaterial.mutateAsync({
          id: editingMaterial.id,
          ...formData,
          category_id: formData.category_id || undefined,
        });
      }
    } else {
      await createMaterial.mutateAsync({
        ...formData,
        category_id: formData.category_id || undefined,
      });
    }

    setIsOpen(false);
    resetForm();
  };

  const handleExcelUpload = async (data: Record<string, unknown>[]) => {
    const items = data.map((row) => ({
      sku: String(row.sku || ''),
      name: String(row.name || ''),
      description: row.description ? String(row.description) : undefined,
      unit: (row.unit as UnitOfMeasure) || 'pcs',
      cost_per_unit: Number(row.cost_per_unit) || 0,
      purchasing_quantity: Number(row.purchasing_quantity) || 0,
      current_stock: Number(row.current_stock) || 0,
      reorder_point: Number(row.reorder_point) || 0,
      is_for_sale: Boolean(row.is_for_sale),
    }));
    await bulkCreate.mutateAsync(items);
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
        <button
          className="text-left hover:underline cursor-pointer"
          onClick={() => handleShowHistory(item)}
        >
          <p className="font-medium">{item.name}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
          )}
        </button>
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
        const isLow = item.current_stock <= item.reorder_point;
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
          </div>
        );
      },
    },
    {
      key: 'purchasingQty',
      header: 'Purchasing Qty',
      cell: (item) => <span className="text-muted-foreground">{item.purchasing_quantity}</span>,
    },
    {
      key: 'forSale',
      header: 'For Sale',
      cell: (item) => item.is_for_sale ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Yes</Badge> : <span className="text-muted-foreground">No</span>,
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
            <DropdownMenuItem onClick={() => handleShowHistory(item)}>
              <History className="mr-2 h-4 w-4" />
              View History
            </DropdownMenuItem>
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
          suppliers={suppliers}
          categories={categories}
          isAddingCategory={isAddingCategory}
          setIsAddingCategory={setIsAddingCategory}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          onAddCategory={handleAddCategory}
          isCreatingCategory={createCategory.isPending}
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsExcelOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          </div>
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
        suppliers={suppliers}
        categories={categories}
        isAddingCategory={isAddingCategory}
        setIsAddingCategory={setIsAddingCategory}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        onAddCategory={handleAddCategory}
        isCreatingCategory={createCategory.isPending}
      />

      <ExcelUpload
        title="Import Raw Materials"
        columns={excelColumns}
        templateFileName="raw_materials_template"
        onUpload={handleExcelUpload}
        isOpen={isExcelOpen}
        onOpenChange={setIsExcelOpen}
      />

      <TransactionHistoryDialog
        material={historyMaterial}
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
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
  suppliers,
  categories,
  isAddingCategory,
  setIsAddingCategory,
  newCategoryName,
  setNewCategoryName,
  onAddCategory,
  isCreatingCategory,
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
  suppliers: { id: string; name: string }[];
  categories: RawMaterialCategory[];
  isAddingCategory: boolean;
  setIsAddingCategory: (adding: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  onAddCategory: () => void;
  isCreatingCategory: boolean;
}) {
  const handleModeChange = (mode: 'new' | 'existing') => {
    setIsAddingNew(mode === 'new');
    if (mode === 'new') {
      setFormData(initialFormData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <Label htmlFor="current_stock">Current Stock</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      min="0"
                      value={formData.current_stock}
                      onChange={(e) =>
                        setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchasing_quantity">Purchasing Qty</Label>
                    <Input
                      id="purchasing_quantity"
                      type="number"
                      min="0"
                      value={formData.purchasing_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, purchasing_quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_point">Reorder Point</Label>
                    <Input
                      id="reorder_point"
                      type="number"
                      min="0"
                      value={formData.reorder_point}
                      onChange={(e) =>
                        setFormData({ ...formData, reorder_point: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                          variant="outline"
                          onClick={() => setIsAddingCategory(false)}
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
                            <SelectValue placeholder="Select category..." />
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
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_for_sale"
                    checked={formData.is_for_sale}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_for_sale: checked === true })
                    }
                  />
                  <Label htmlFor="is_for_sale" className="cursor-pointer">
                    Available for sale (can be selected in quotations)
                  </Label>
                </div>
              </>
            )}

            {/* Quantity field for adding to existing */}
            {!isAddingNew && selectedExistingId && (
              <div className="space-y-2">
                <Label htmlFor="add_quantity">Quantity to Add *</Label>
                <Input
                  id="add_quantity"
                  type="number"
                  min="1"
                  value={formData.current_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing && isAddingNew ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
