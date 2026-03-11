import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDispatchToBranch, type Branch } from '@/hooks/useBranchInventory';
import type { Product } from '@/types/erp';

interface DispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}

export function DispatchDialog({ open, onOpenChange, products }: DispatchDialogProps) {
  const [productId, setProductId] = useState('');
  const [branch, setBranch] = useState<Branch>('cairo');
  const [quantity, setQuantity] = useState(1);
  const dispatch = useDispatchToBranch();

  const selectedProduct = products.find(p => p.id === productId);

  const handleSubmit = async () => {
    if (!productId || quantity <= 0) return;
    await dispatch.mutateAsync({ productId, branch, quantity });
    onOpenChange(false);
    setProductId('');
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispatch to Branch</DialogTitle>
          <DialogDescription>
            Transfer products from Main Inventory to a branch location.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => p.current_stock > 0).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stock: {p.current_stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select value={branch} onValueChange={(v) => setBranch(v as Branch)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cairo">Cairo</SelectItem>
                <SelectItem value="north_coast">North Coast</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              max={selectedProduct?.current_stock || 999}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Available: {selectedProduct.current_stock} {selectedProduct.unit}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={dispatch.isPending || !productId || quantity <= 0}
          >
            {dispatch.isPending ? 'Dispatching...' : 'Dispatch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
