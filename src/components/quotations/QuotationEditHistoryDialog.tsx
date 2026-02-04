import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuotationEditHistory } from '@/hooks/useQuotationEditHistory';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Clock, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

interface QuotationEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  quotationNumber: string;
}

interface QuotationWithItems {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  valid_from: string;
  valid_until: string;
  discount_percent: number;
  tax_percent: number;
  subtotal: number;
  total: number;
  notes: string | null;
  status: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

export function QuotationEditHistoryDialog({
  open,
  onOpenChange,
  quotationId,
  quotationNumber,
}: QuotationEditHistoryDialogProps) {
  const { data: history = [], isLoading: historyLoading } = useQuotationEditHistory(quotationId);

  // Fetch current quotation
  const { data: currentQuotation, isLoading: currentLoading } = useQuery({
    queryKey: ['quotation-current', quotationId],
    queryFn: async () => {
      const { data: quotation, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();
      
      if (error) throw error;

      const { data: items } = await supabase
        .from('quotation_items')
        .select('description, quantity, unit_price, total')
        .eq('quotation_id', quotationId);

      return {
        ...quotation,
        items: items || [],
      } as QuotationWithItems;
    },
    enabled: open && !!quotationId,
  });

  // Reconstruct original quotation from edit history
  const originalQuotation = (() => {
    if (!currentQuotation || history.length === 0) return currentQuotation;

    // Start with current quotation data
    const original: Record<string, unknown> = { ...currentQuotation };
    
    // Sort history by date (oldest first)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.edited_at).getTime() - new Date(b.edited_at).getTime()
    );

    // Collect all original values from edit history
    // Walk through all history entries and get the original (old) values
    const originalValues: Record<string, unknown> = {};
    for (const entry of sortedHistory) {
      for (const [field, change] of Object.entries(entry.changes)) {
        const typedChange = change as { old: unknown; new: unknown };
        // Only set if not already set (keep earliest original value)
        if (!(field in originalValues)) {
          originalValues[field] = typedChange.old;
        }
      }
    }

    return { ...currentQuotation, ...originalValues } as QuotationWithItems;
  })();

  const formatValue = (value: unknown, field?: string): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'number') {
      if (field?.includes('percent')) return `${value}%`;
      if (field === 'subtotal' || field === 'total' || field?.includes('price')) {
        return formatCurrency(value);
      }
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

  // Get all changed fields
  const changedFields = new Set<string>();
  history.forEach(entry => {
    Object.keys(entry.changes).forEach(field => changedFields.add(field));
  });

  const isLoading = historyLoading || currentLoading;

  const renderQuotationCard = (quotation: QuotationWithItems | undefined, label: string, isOriginal: boolean) => {
    if (!quotation) return null;

    const borderColor = isOriginal ? 'border-destructive/30' : 'border-green-500/30';
    const bgColor = isOriginal ? 'bg-destructive/5' : 'bg-green-500/5';
    const headerColor = isOriginal ? 'text-destructive' : 'text-green-600 dark:text-green-400';
    const highlightColor = isOriginal ? 'text-destructive font-medium' : 'text-green-600 font-medium';

    return (
      <div className={`rounded-lg border p-4 ${borderColor} ${bgColor}`}>
        <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${headerColor}`}>
          {label}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Customer:</span>
            <span className={changedFields.has('customer_name') ? highlightColor : ''}>
              {quotation.customer_name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Valid Until:</span>
            <span className={changedFields.has('valid_until') ? highlightColor : ''}>
              {format(new Date(quotation.valid_until), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Discount:</span>
            <span className={changedFields.has('discount_percent') ? highlightColor : ''}>
              {quotation.discount_percent}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Tax:</span>
            <span className={changedFields.has('tax_percent') ? highlightColor : ''}>
              {quotation.tax_percent}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className={changedFields.has('subtotal') ? highlightColor : ''}>
              {formatCurrency(quotation.subtotal)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-semibold">
            <span className="text-muted-foreground">Total:</span>
            <span className={changedFields.has('total') ? highlightColor : ''}>
              {formatCurrency(quotation.total)}
            </span>
          </div>
          {quotation.notes && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground block mb-1">Notes:</span>
              <span className={changedFields.has('notes') ? highlightColor : ''}>
                {quotation.notes}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit History - {quotationNumber}
          </DialogTitle>
          <DialogDescription>
            Compare the original quotation with the current version. Changes are highlighted in red (original) and green (current).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No edit history - this quotation has not been modified.</p>
          ) : (
            <Tabs defaultValue="comparison" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="comparison">Original vs Current</TabsTrigger>
                <TabsTrigger value="timeline">Edit Timeline ({history.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison">
                <div className="space-y-4">
                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {renderQuotationCard(originalQuotation, 'Original (First Created)', true)}
                    {renderQuotationCard(currentQuotation, 'Current (Final Version)', false)}
                  </div>

                  {/* Changes summary */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h4 className="font-semibold mb-3">Changes Summary</h4>
                    <div className="space-y-2">
                      {Array.from(changedFields).map(field => {
                        const originalValue = originalQuotation?.[field as keyof QuotationWithItems];
                        const currentValue = currentQuotation?.[field as keyof QuotationWithItems];
                        
                        return (
                          <div key={field} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{getFieldLabel(field)}</Badge>
                            <span className="text-destructive line-through">{formatValue(originalValue, field)}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-green-600 dark:text-green-400 font-medium">{formatValue(currentValue, field)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <div className="space-y-4">
                  {history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border bg-card overflow-hidden"
                    >
                      <div className="flex justify-between items-center p-3 bg-muted/50 border-b">
                        <Badge variant="outline">
                          Edit #{history.length - index}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.edited_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 divide-x">
                        <div className="p-3">
                          <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Before</h5>
                          <div className="space-y-1">
                            {Object.entries(entry.changes).map(([field, change]) => {
                              const typedChange = change as { old: unknown; new: unknown };
                              return (
                                <div key={field} className="text-sm">
                                  <span className="text-muted-foreground">{getFieldLabel(field)}:</span>
                                  <span className="ml-2 text-destructive font-medium">{formatValue(typedChange.old, field)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="p-3">
                          <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">After</h5>
                          <div className="space-y-1">
                            {Object.entries(entry.changes).map(([field, change]) => {
                              const typedChange = change as { old: unknown; new: unknown };
                              return (
                                <div key={field} className="text-sm">
                                  <span className="text-muted-foreground">{getFieldLabel(field)}:</span>
                                  <span className="ml-2 text-green-600 dark:text-green-400 font-medium">{formatValue(typedChange.new, field)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
