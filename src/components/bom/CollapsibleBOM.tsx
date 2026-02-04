import { useState } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useBomItemsByProduct } from '@/hooks/useBOM';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

interface CollapsibleBOMProps {
  productId: string;
  productName: string;
  quantity?: number;
  manufacturingTime?: number;
}

export function CollapsibleBOM({ productId, productName, quantity = 1, manufacturingTime }: CollapsibleBOMProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: bomItems = [], isLoading } = useBomItemsByProduct(productId);

  // Calculate summary
  const totalCost = bomItems.reduce((sum, item) => {
    return sum + (Number(item.quantity) * quantity * Number(item.raw_material?.cost_per_unit || 0));
  }, 0);

  const materialCount = bomItems.length;

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (bomItems.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Package className="h-4 w-4" />
        <span>No BOM defined for {productName}</span>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between hover:bg-muted/50 p-4 h-auto"
        >
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Package className="h-4 w-4" />
            <span className="font-medium">{productName}</span>
            <Badge variant="outline" className="ml-2">
              {materialCount} material{materialCount !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {quantity > 1 && `×${quantity} = `}
              <span className="font-semibold text-foreground">{formatCurrency(totalCost)}</span>
            </span>
            {manufacturingTime && (
              <Badge variant="secondary">
                {Math.floor(manufacturingTime / 60)}h {manufacturingTime % 60}m
              </Badge>
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="border-t px-4 py-3 bg-muted/30">
          <div className="space-y-2">
            <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-2 border-b">
              <span className="col-span-2">Material</span>
              <span className="text-right">Unit Cost</span>
              <span className="text-right">Qty/Unit</span>
              <span className="text-right">Total Cost</span>
            </div>
            {bomItems.map((item) => {
              const unitCost = Number(item.raw_material?.cost_per_unit || 0);
              const qtyPerUnit = Number(item.quantity);
              const totalQty = qtyPerUnit * quantity;
              const itemCost = totalQty * unitCost;

              return (
                <div key={item.id} className="grid grid-cols-5 py-2 text-sm border-b border-dashed last:border-0">
                  <div className="col-span-2">
                    <span className="font-medium">{item.raw_material?.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({item.raw_material?.sku})
                    </span>
                  </div>
                  <span className="text-right text-muted-foreground">
                    {formatCurrency(unitCost)}/{item.raw_material?.unit}
                  </span>
                  <span className="text-right">
                    {qtyPerUnit} {item.raw_material?.unit}
                    {quantity > 1 && (
                      <span className="text-muted-foreground"> (×{quantity} = {totalQty})</span>
                    )}
                  </span>
                  <span className="text-right font-medium">
                    {formatCurrency(itemCost)}
                  </span>
                </div>
              );
            })}
            
            {/* Summary row */}
            <div className="pt-2 flex justify-between items-center font-medium border-t">
              <span>Total Material Cost</span>
              <span className="text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface CollapsibleBOMListProps {
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    manufacturingTime?: number;
  }>;
}

export function CollapsibleBOMList({ items }: CollapsibleBOMListProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <CollapsibleBOM
          key={`${item.productId}-${index}`}
          productId={item.productId}
          productName={item.productName}
          quantity={item.quantity}
          manufacturingTime={item.manufacturingTime}
        />
      ))}
    </div>
  );
}
