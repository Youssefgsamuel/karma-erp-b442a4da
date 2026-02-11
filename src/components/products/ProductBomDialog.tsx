import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBomItemsByProduct } from '@/hooks/useBOM';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import type { BomItem, RawMaterial } from '@/types/erp';

interface ProductBomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

type BomItemWithMaterial = BomItem & { raw_material: RawMaterial };

export function ProductBomDialog({ open, onOpenChange, productId, productName }: ProductBomDialogProps) {
  const { data: bomItems = [], isLoading } = useBomItemsByProduct(productId);

  const totalCost = bomItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.raw_material?.cost_per_unit || 0), 0
  );

  const columns: Column<BomItemWithMaterial>[] = [
    { key: 'material', header: 'Material', cell: (item) => (
      <div>
        <p className="font-medium">{item.raw_material?.name}</p>
        <p className="text-xs text-muted-foreground">{item.raw_material?.sku}</p>
      </div>
    )},
    { key: 'unit', header: 'Unit', cell: (item) => <Badge variant="outline">{item.raw_material?.unit}</Badge> },
    { key: 'qty', header: 'Qty/Unit', cell: (item) => item.quantity },
    { key: 'cost', header: 'Unit Cost', cell: (item) => formatCurrency(item.raw_material?.cost_per_unit || 0) },
    { key: 'total', header: 'Total Cost', cell: (item) => (
      <span className="font-medium">{formatCurrency(Number(item.quantity) * Number(item.raw_material?.cost_per_unit || 0))}</span>
    )},
    { key: 'notes', header: 'Notes', cell: (item) => <span className="text-muted-foreground text-sm">{item.notes || '-'}</span> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill of Materials — {productName}</DialogTitle>
          <DialogDescription>
            Materials required to manufacture this product. Total cost: {formatCurrency(totalCost)}
          </DialogDescription>
        </DialogHeader>
        <DataTable
          columns={columns}
          data={bomItems as BomItemWithMaterial[]}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyMessage="No BOM defined for this product."
        />
      </DialogContent>
    </Dialog>
  );
}
