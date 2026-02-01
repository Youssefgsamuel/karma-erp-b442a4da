import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MoItemWithProduct } from '@/hooks/useMoItems';
import type { ManufacturingOrder } from '@/hooks/useManufacturingOrders';

interface MoProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mo: ManufacturingOrder | null;
  items: MoItemWithProduct[];
}

const itemStatusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function MoProductsDialog({ open, onOpenChange, mo, items }: MoProductsDialogProps) {
  if (!mo) return null;

  // Combine primary product with mo_items
  const allItems = [
    {
      id: 'primary',
      product: mo.product,
      quantity: mo.quantity,
      status: mo.status === 'completed' ? 'completed' : mo.status === 'in_progress' ? 'in_progress' : 'pending',
    },
    ...items.map(item => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
      status: item.status,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Products in {mo.mo_number}</DialogTitle>
          <DialogDescription>
            {allItems.length} different product{allItems.length !== 1 ? 's' : ''} to manufacture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {allItems.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                <p className="text-sm text-muted-foreground">SKU: {item.product?.sku || '-'}</p>
              </div>
              <Badge className={itemStatusColors[item.status] || itemStatusColors.pending}>
                {item.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
