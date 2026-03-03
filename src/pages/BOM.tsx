import { useState, useMemo } from 'react';
import { useBomItems, useCreateBomItem, useDeleteBomItem } from '@/hooks/useBOM';
import { useProducts } from '@/hooks/useProducts';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ClipboardList, Plus, Trash2, Search, ChevronDown, ChevronRight, Package } from 'lucide-react';
import type { BomItemWithDetails } from '@/hooks/useBOM';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BOM() {
  const { data: bomItems = [], isLoading } = useBomItems();
  const { data: products = [] } = useProducts();
  const { data: rawMaterials = [] } = useRawMaterials();
  const createBomItem = useCreateBomItem();
  const deleteBomItem = useDeleteBomItem();
  const { t } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [materials, setMaterials] = useState([
    { raw_material_id: '', quantity: 1, notes: '' }
  ]);

  // Group BOM items by product
  const groupedByProduct = useMemo(() => {
    const filtered = bomItems.filter(
      (item) =>
        item.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.raw_material?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, { product: BomItemWithDetails['product']; items: BomItemWithDetails[] }> = {};
    for (const item of filtered) {
      const pid = item.product_id;
      if (!groups[pid]) {
        groups[pid] = { product: item.product, items: [] };
      }
      groups[pid].items.push(item);
    }
    return Object.entries(groups);
  }, [bomItems, searchQuery]);

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

  const dialogContent = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t.bom.addBOMItems}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t.bom.addBOMItems}</DialogTitle>
            <DialogDescription>
              {t.bom.description}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.bom.product} *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.bom.selectProduct} />
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
                <Label>{t.bom.rawMaterial} *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMaterial}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t.bom.addMaterial}
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
                            <SelectValue placeholder={t.bom.selectRawMaterial} />
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
                          placeholder={t.quantity}
                          value={material.quantity}
                          onChange={(e) => handleMaterialChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                        {selectedMaterial && (
                          <span className="text-xs text-muted-foreground">{selectedMaterial.unit}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder={t.notes}
                          value={material.notes}
                          onChange={(e) => handleMaterialChange(index, 'notes', e.target.value)}
                        />
                      </div>
                      {materials.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMaterial(index)}>
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
                  {t.bom.totalMaterialCost}: <span className="text-primary">${totalMaterialCost.toFixed(2)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {validMaterials.length} {t.bom.materialsSelected}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t.cancel}
            </Button>
            <Button 
              type="submit" 
              disabled={createBomItem.isPending || !selectedProductId || validMaterials.length === 0}
            >
              {createBomItem.isPending ? t.loading : `${t.add} ${validMaterials.length}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (!isLoading && bomItems.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title={t.bom.title} description={t.bom.description} />
        <EmptyState
          icon={ClipboardList}
          title={t.bom.noBOM}
          description={t.bom.noBOMDescription}
          action={{ label: t.bom.addBOMItems, onClick: () => setIsOpen(true) }}
        />
        {dialogContent}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title={t.bom.title} description={t.bom.description} actions={dialogContent} />

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.bom.searchByProduct}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Collapsible product groups */}
      <div className="space-y-3">
        {groupedByProduct.map(([productId, group]) => {
          const totalCost = group.items.reduce(
            (sum, item) => sum + Number(item.quantity) * Number(item.raw_material?.cost_per_unit || 0), 0
          );
          const materialCount = group.items.length;

          return (
            <ProductBomGroup
              key={productId}
              productName={group.product?.name || 'Unknown'}
              productSku={group.product?.sku || ''}
              materialCount={materialCount}
              totalCost={totalCost}
              items={group.items}
              onDeleteItem={(id) => deleteBomItem.mutate(id)}
              t={t}
            />
          );
        })}
      </div>

      {groupedByProduct.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          {t.noData}
        </div>
      )}
    </div>
  );
}

interface ProductBomGroupProps {
  productName: string;
  productSku: string;
  materialCount: number;
  totalCost: number;
  items: BomItemWithDetails[];
  onDeleteItem: (id: string) => void;
  t: any;
}

function ProductBomGroup({ productName, productSku, materialCount, totalCost, items, onDeleteItem, t }: ProductBomGroupProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between hover:bg-muted/50 p-4 h-auto rounded-lg"
        >
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Package className="h-5 w-5 text-primary" />
            <div className="text-start">
              <span className="font-semibold text-base">{productName}</span>
              <span className="text-xs text-muted-foreground mx-2">({productSku})</span>
            </div>
            <Badge variant="outline" className="ml-2">
              {materialCount} {materialCount !== 1 ? t.bom.materials : t.bom.material}
            </Badge>
          </div>
          <span className="font-semibold text-primary">{formatCurrency(totalCost)}</span>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="border-t px-4 py-3 bg-muted/20">
          <div className="space-y-1">
            <div className="grid grid-cols-6 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-2 border-b">
              <span className="col-span-2">{t.bom.rawMaterial}</span>
              <span className="text-end">{t.bom.unitCost}</span>
              <span className="text-end">{t.bom.qtyPerUnit}</span>
              <span className="text-end">{t.bom.materialCost}</span>
              <span className="text-end">{t.actions}</span>
            </div>
            {items.map((item) => {
              const unitCost = Number(item.raw_material?.cost_per_unit || 0);
              const qty = Number(item.quantity);
              const itemCost = qty * unitCost;

              return (
                <div key={item.id} className="grid grid-cols-6 py-2.5 text-sm border-b border-dashed last:border-0 items-center">
                  <div className="col-span-2">
                    <span className="font-medium">{item.raw_material?.name}</span>
                    <span className="text-xs text-muted-foreground mx-1">({item.raw_material?.sku})</span>
                  </div>
                  <span className="text-end text-muted-foreground">
                    {formatCurrency(unitCost)}/{item.raw_material?.unit}
                  </span>
                  <span className="text-end">
                    {qty} {item.raw_material?.unit}
                  </span>
                  <span className="text-end font-medium">
                    {formatCurrency(itemCost)}
                  </span>
                  <div className="text-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-2 flex justify-between items-center font-medium border-t">
              <span>{t.bom.totalMaterialCost}</span>
              <span className="text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
