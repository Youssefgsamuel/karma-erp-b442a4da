import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuotation, useQuotationItems, useUpdateQuotation } from '@/hooks/useQuotations';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface QuotationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
}

interface EditItem {
  id?: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

export function QuotationEditDialog({
  open,
  onOpenChange,
  quotationId,
}: QuotationEditDialogProps) {
  const { data: quotation, isLoading: quotationLoading } = useQuotation(quotationId);
  const { data: items = [], isLoading: itemsLoading } = useQuotationItems(quotationId);
  const updateQuotation = useUpdateQuotation();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    valid_from: '',
    valid_until: '',
    discount_percent: 0,
    tax_percent: 0,
    notes: '',
  });

  const [editItems, setEditItems] = useState<EditItem[]>([]);

  useEffect(() => {
    if (quotation) {
      setFormData({
        customer_name: quotation.customer_name,
        customer_email: quotation.customer_email || '',
        customer_phone: quotation.customer_phone || '',
        valid_from: quotation.valid_from,
        valid_until: quotation.valid_until,
        discount_percent: quotation.discount_percent,
        tax_percent: quotation.tax_percent,
        notes: quotation.notes || '',
      });
    }
  }, [quotation]);

  useEffect(() => {
    if (items.length > 0) {
      setEditItems(items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })));
    }
  }, [items]);

  const isLoading = quotationLoading || itemsLoading;

  const handleItemChange = (index: number, field: keyof EditItem, value: string | number) => {
    setEditItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    setEditItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = editItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = subtotal * (formData.discount_percent || 0) / 100;
  const taxAmount = (subtotal - discountAmount) * (formData.tax_percent || 0) / 100;
  const total = subtotal - discountAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateQuotation.mutateAsync({
      id: quotationId,
      ...formData,
      items: editItems.map(item => ({
        id: item.id,
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quotation {quotation?.quotation_number}</DialogTitle>
          <DialogDescription>Update quotation details and items.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Customer Phone</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              <div className="space-y-2">
                {editItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                      className="w-24"
                    />
                    {editItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount %</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax %</Label>
                <Input
                  id="tax"
                  type="number"
                  value={formData.tax_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_percent: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount:</span> <span>-{formatCurrency(discountAmount)}</span></div>
              <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total:</span> <span>{formatCurrency(total)}</span></div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={updateQuotation.isPending}>
                {updateQuotation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
