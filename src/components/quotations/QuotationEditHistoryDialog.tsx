import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuotationEditHistory } from '@/hooks/useQuotationEditHistory';
import { format } from 'date-fns';
import { Loader2, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QuotationEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  quotationNumber: string;
}

export function QuotationEditHistoryDialog({
  open,
  onOpenChange,
  quotationId,
  quotationNumber,
}: QuotationEditHistoryDialogProps) {
  const { data: history = [], isLoading } = useQuotationEditHistory(quotationId);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      customer_name: 'Customer Name',
      customer_email: 'Customer Email',
      customer_phone: 'Customer Phone',
      valid_from: 'Valid From',
      valid_until: 'Valid Until',
      discount_percent: 'Discount %',
      tax_percent: 'Tax %',
      subtotal: 'Subtotal',
      total: 'Total',
      notes: 'Notes',
      status: 'Status',
      items: 'Items',
    };
    return labels[field] || field;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit History</DialogTitle>
          <DialogDescription>
            Changes made to {quotationNumber}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No edit history</p>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.edited_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(entry.changes).map(([field, change]) => (
                      <div key={field} className="text-sm">
                        <span className="font-medium">{getFieldLabel(field)}:</span>
                        <div className="flex items-center gap-2 mt-1 pl-4">
                          <span className="text-muted-foreground line-through">
                            {formatValue((change as { old: unknown; new: unknown }).old)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-foreground">
                            {formatValue((change as { old: unknown; new: unknown }).new)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
