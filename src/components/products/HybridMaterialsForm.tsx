import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import type { MaterialSourceType, RawMaterial } from '@/types/erp';

export interface MaterialLine {
  raw_material_id: string;
  quantity: number;
  source_type: MaterialSourceType;
}

interface HybridMaterialsFormProps {
  materials: MaterialLine[];
  onChange: (materials: MaterialLine[]) => void;
}

export function HybridMaterialsForm({ materials, onChange }: HybridMaterialsFormProps) {
  const { data: rawMaterials = [] } = useRawMaterials();

  const addLine = () => {
    onChange([...materials, { raw_material_id: '', quantity: 1, source_type: 'in_house' }]);
  };

  const removeLine = (index: number) => {
    onChange(materials.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, updates: Partial<MaterialLine>) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], ...updates };
    onChange(newMaterials);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Materials</Label>
        <Button type="button" size="sm" variant="outline" onClick={addLine}>
          <Plus className="mr-1 h-4 w-4" /> Add Material
        </Button>
      </div>
      
      {materials.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Add at least one material for hybrid products.
        </p>
      )}

      <div className="space-y-3">
        {materials.map((line, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <Label className="text-xs">Raw Material</Label>
              <Select
                value={line.raw_material_id}
                onValueChange={(v) => updateLine(index, { raw_material_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-4">
              <Label className="text-xs">Source Type</Label>
              <Select
                value={line.source_type}
                onValueChange={(v) => updateLine(index, { source_type: v as MaterialSourceType })}
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
            <div className="col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLine(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
