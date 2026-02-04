import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollapsibleBOM } from '@/components/bom/CollapsibleBOM';
import type { MoItemWithProduct } from '@/hooks/useMoItems';
import type { ManufacturingOrder } from '@/hooks/useManufacturingOrders';
import { formatNumber } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  // Fetch full product details for BOM display
  const productIds = mo ? [mo.product_id, ...items.map(i => i.product_id)] : [];
  const { data: productsData = [] } = useQuery({
    queryKey: ['products-for-bom', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, manufacturing_time_minutes')
        .in('id', productIds);
      if (error) throw error;
      return data;
    },
    enabled: open && productIds.length > 0,
  });

  const productsMap = new Map(productsData.map(p => [p.id, p]));

  if (!mo) return null;

  // Combine primary product with mo_items
  const allItems = [
    {
      id: 'primary',
      productId: mo.product_id,
      productName: mo.product?.name || 'Unknown Product',
      productSku: mo.product?.sku || '-',
      quantity: mo.quantity,
      status: mo.status === 'completed' ? 'completed' : mo.status === 'in_progress' ? 'in_progress' : 'pending',
    },
    ...items.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product?.name || 'Unknown Product',
      productSku: item.product?.sku || '-',
      quantity: item.quantity,
      status: item.status,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Products in {mo.mo_number}</DialogTitle>
          <DialogDescription>
            {allItems.length} product{allItems.length !== 1 ? 's' : ''} • Total Qty: {formatNumber(allItems.reduce((sum, i) => sum + Number(i.quantity), 0))}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="products" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 overflow-y-auto m-0">
            <div className="space-y-2">
              {allItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.productSku} • Qty: {formatNumber(Number(item.quantity))}
                    </p>
                  </div>
                  <Badge className={itemStatusColors[item.status] || itemStatusColors.pending}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bom" className="flex-1 overflow-y-auto m-0">
            <div className="space-y-2">
              {allItems.map((item) => {
                const fullProduct = productsMap.get(item.productId);
                return (
                  <CollapsibleBOM
                    key={item.id}
                    productId={item.productId}
                    productName={item.productName}
                    quantity={Number(item.quantity)}
                    manufacturingTime={fullProduct?.manufacturing_time_minutes}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
