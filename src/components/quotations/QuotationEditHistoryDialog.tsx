import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuotationEditHistory } from '@/hooks/useQuotationEditHistory';
import { format } from 'date-fns';
import { Loader2, ArrowRight, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
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
    return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit History
          </DialogTitle>
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
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex justify-between items-center mb-3">
                    <Badge variant="outline">
                      Edit #{history.length - index}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.edited_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(entry.changes).map(([field, change]) => {
                      const typedChange = change as { old: unknown; new: unknown };
                      return (
                        <div key={field} className="bg-muted/50 rounded-md p-3">
                          <span className="font-medium text-sm block mb-2">
                            {getFieldLabel(field)}
                          </span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-destructive bg-destructive/10 px-2 py-1 rounded line-through">
                              {formatValue(typedChange.old)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-green-600 bg-green-500/10 px-2 py-1 rounded">
                              {formatValue(typedChange.new)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
