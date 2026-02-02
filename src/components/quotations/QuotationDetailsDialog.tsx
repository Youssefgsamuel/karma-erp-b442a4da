import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuotation, useQuotationItems, Quotation } from '@/hooks/useQuotations';
import { format } from 'date-fns';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface QuotationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
}

const statusColors: Record<Quotation['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  expired: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function QuotationDetailsDialog({
  open,
  onOpenChange,
  quotationId,
}: QuotationDetailsDialogProps) {
  const { data: quotation, isLoading: quotationLoading } = useQuotation(quotationId);
  const { data: items = [], isLoading: itemsLoading } = useQuotationItems(quotationId);

  const isLoading = quotationLoading || itemsLoading;

  if (!quotation && !isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {quotation?.quotation_number}
            {quotation && <Badge className={statusColors[quotation.status]}>{quotation.status}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Quotation details and items
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : quotation ? (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{quotation.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{quotation.customer_email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{quotation.customer_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valid Period</p>
                <p className="font-medium">
                  {format(new Date(quotation.valid_from), 'MMM d')} - {format(new Date(quotation.valid_until), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h4 className="font-medium mb-3">Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-right p-3 text-sm font-medium">Qty</th>
                      <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                      <th className="text-right p-3 text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <span className="font-medium">{item.description}</span>
                          {item.product && (
                            <span className="text-muted-foreground text-sm ml-2">({item.product.sku})</span>
                          )}
                        </td>
                        <td className="p-3 text-right">{formatNumber(item.quantity)}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discount_percent > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount ({quotation.discount_percent}%):</span>
                  <span>-{formatCurrency(quotation.subtotal * quotation.discount_percent / 100)}</span>
                </div>
              )}
              {quotation.tax_percent > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({quotation.tax_percent}%):</span>
                  <span>{formatCurrency((quotation.subtotal - quotation.subtotal * quotation.discount_percent / 100) * quotation.tax_percent / 100)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(quotation.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-1">{quotation.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
