import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuotationEditHistory } from '@/hooks/useQuotationEditHistory';
import { format } from 'date-fns';
import { Loader2, Clock } from 'lucide-react';
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
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit History
          </DialogTitle>
          <DialogDescription>
            Changes made to {quotationNumber}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No edit history</p>
          ) : (
            <div className="space-y-6">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  <div className="flex justify-between items-center p-4 bg-muted/50 border-b">
                    <Badge variant="outline">
                      Edit #{history.length - index}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.edited_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  
                  {/* Side by side comparison */}
                  <div className="grid grid-cols-2 divide-x">
                    {/* Before column */}
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        Before
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(entry.changes).map(([field, change]) => {
                          const typedChange = change as { old: unknown; new: unknown };
                          return (
                            <div key={field} className="space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {getFieldLabel(field)}
                              </span>
                              <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                                <span className="text-red-700 dark:text-red-400 font-medium">
                                  {formatValue(typedChange.old)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* After column */}
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        After
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(entry.changes).map(([field, change]) => {
                          const typedChange = change as { old: unknown; new: unknown };
                          return (
                            <div key={field} className="space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {getFieldLabel(field)}
                              </span>
                              <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                                <span className="text-green-700 dark:text-green-400 font-medium">
                                  {formatValue(typedChange.new)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
