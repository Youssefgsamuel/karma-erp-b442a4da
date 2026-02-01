import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MoItemWithProduct } from '@/hooks/useMoItems';
import type { ManufacturingOrder } from '@/hooks/useManufacturingOrders';
import { formatNumber } from '@/lib/utils';

interface MoQuantityDialogProps {
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

export function MoQuantityDialog({ open, onOpenChange, mo, items }: MoQuantityDialogProps) {
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

  const totalQty = allItems.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quantity Breakdown - {mo.mo_number}</DialogTitle>
          <DialogDescription>
            Total quantity: {formatNumber(totalQty)} units across {allItems.length} product{allItems.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {allItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{formatNumber(item.quantity)}</span>
                <Badge className={itemStatusColors[item.status] || itemStatusColors.pending}>
                  {item.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between items-center font-medium">
            <span>Total Quantity</span>
            <span className="text-xl">{formatNumber(totalQty)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
