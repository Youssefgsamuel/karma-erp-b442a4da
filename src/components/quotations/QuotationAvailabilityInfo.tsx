import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, PackageCheck, Factory } from 'lucide-react';

interface QuotationItem {
  product_id?: string;
  quantity: number;
  description: string;
}

interface Product {
  id: string;
  name: string;
  current_stock: number;
  assigned_quantity: number;
}

interface QuotationAvailabilityInfoProps {
  items: QuotationItem[];
  products: Product[];
}

export function QuotationAvailabilityInfo({ items, products }: QuotationAvailabilityInfoProps) {
  const availability = useMemo(() => {
    const productItems = items.filter(item => item.product_id);
    
    if (productItems.length === 0) {
      return { type: 'none' as const, items: [], inStock: [], needMO: [] };
    }

    const itemsWithAvailability = productItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      const currentStock = Number(product?.current_stock || 0);
      const assignedQty = Number(product?.assigned_quantity || 0);
      const availableStock = currentStock - assignedQty;
      const canFulfill = availableStock >= item.quantity;
      const shortage = Math.max(0, item.quantity - availableStock);

      return {
        ...item,
        product,
        currentStock,
        assignedQty,
        availableStock,
        canFulfill,
        shortage,
      };
    });

    const inStock = itemsWithAvailability.filter(i => i.canFulfill);
    const needMO = itemsWithAvailability.filter(i => !i.canFulfill);
    
    let type: 'all_in_stock' | 'partial' | 'all_need_mo' | 'none';
    if (inStock.length === itemsWithAvailability.length) {
      type = 'all_in_stock';
    } else if (needMO.length === itemsWithAvailability.length) {
      type = 'all_need_mo';
    } else {
      type = 'partial';
    }

    return { type, items: itemsWithAvailability, inStock, needMO };
  }, [items, products]);

  if (availability.type === 'none') return null;

  return (
    <div className="space-y-3">
      {/* Summary Alert */}
      {availability.type === 'all_in_stock' && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-300">All Items Available</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            All {availability.items.length} item(s) can be fulfilled from current inventory. No manufacturing order required.
          </AlertDescription>
        </Alert>
      )}

      {availability.type === 'partial' && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">Partial Availability</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            {availability.inStock.length} item(s) available in inventory, {availability.needMO.length} item(s) require manufacturing.
            You can fulfill from inventory for available items and create MO for the rest.
          </AlertDescription>
        </Alert>
      )}

      {availability.type === 'all_need_mo' && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <Factory className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Manufacturing Required</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            All {availability.items.length} item(s) require manufacturing. A manufacturing order will be created upon acceptance.
          </AlertDescription>
        </Alert>
      )}

      {/* Item breakdown */}
      <div className="border rounded-lg divide-y">
        <div className="grid grid-cols-5 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/50">
          <span className="col-span-2">Product</span>
          <span className="text-right">Required</span>
          <span className="text-right">Available</span>
          <span className="text-right">Status</span>
        </div>
        {availability.items.map((item, index) => (
          <div key={index} className="grid grid-cols-5 px-3 py-2 text-sm items-center">
            <div className="col-span-2">
              <span className="font-medium">{item.product?.name || item.description}</span>
            </div>
            <span className="text-right">{item.quantity}</span>
            <span className="text-right">
              <span className={item.availableStock < item.quantity ? 'text-destructive font-medium' : 'text-green-600'}>
                {item.availableStock}
              </span>
              {item.assignedQty > 0 && (
                <span className="text-xs text-muted-foreground block">
                  ({item.currentStock} - {item.assignedQty} assigned)
                </span>
              )}
            </span>
            <div className="text-right">
              {item.canFulfill ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <PackageCheck className="h-3 w-3 mr-1" />
                  In Stock
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <Factory className="h-3 w-3 mr-1" />
                  Need {item.shortage}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
