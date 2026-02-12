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

interface QuotationItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
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
  items: QuotationItem[];
}

export function QuotationEditHistoryDialog({
  open,
  onOpenChange,
  quotationId,
  quotationNumber,
}: QuotationEditHistoryDialogProps) {
  const { data: history = [], isLoading: historyLoading } = useQuotationEditHistory(quotationId);

  // Fetch current quotation with items
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

      return { ...quotation, items: items || [] } as QuotationWithItems;
    },
    enabled: open && !!quotationId,
  });

  // Reconstruct original quotation from edit history
  const originalQuotation = (() => {
    if (!currentQuotation || history.length === 0) return currentQuotation;

    const original: Record<string, unknown> = { ...currentQuotation };
    const sortedHistory = [...history].sort((a, b) =>
      new Date(a.edited_at).getTime() - new Date(b.edited_at).getTime()
    );

    // Get earliest original values for each changed field
    const originalValues: Record<string, unknown> = {};
    let originalItems: QuotationItem[] | null = null;

    for (const entry of sortedHistory) {
      for (const [field, change] of Object.entries(entry.changes)) {
        const typedChange = change as { old: unknown; new: unknown };
        if (field === 'items' && !originalItems) {
          originalItems = typedChange.old as QuotationItem[];
        } else if (!(field in originalValues)) {
          originalValues[field] = typedChange.old;
        }
      }
    }

    const result = { ...currentQuotation, ...originalValues } as QuotationWithItems;
    if (originalItems) {
      result.items = originalItems;
    }
    return result;
  })();

  // Get all changed fields
  const changedFields = new Set<string>();
  history.forEach(entry => {
    Object.keys(entry.changes).forEach(field => changedFields.add(field));
  });

  const isLoading = historyLoading || currentLoading;

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
      items: 'Items',
    };
    return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (value: unknown, field?: string): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'number') {
      if (field?.includes('percent')) return `${value}%`;
      if (field === 'subtotal' || field === 'total' || field?.includes('price'))
        return formatCurrency(value);
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (Array.isArray(value)) return `${value.length} item(s)`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderItemsTable = (items: QuotationItem[], highlight: 'red' | 'green' | 'none') => {
    const textClass =
      highlight === 'red' ? 'text-destructive' : highlight === 'green' ? 'text-green-600 dark:text-green-400' : '';

    return (
      <div className="mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-1 font-medium">Description</th>
              <th className="text-right py-1 font-medium">Qty</th>
              <th className="text-right py-1 font-medium">Price</th>
              <th className="text-right py-1 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={`border-b border-border/50 ${textClass}`}>
                <td className="py-1">{item.description}</td>
                <td className="text-right py-1">{item.quantity}</td>
                <td className="text-right py-1">{formatCurrency(item.unit_price)}</td>
                <td className="text-right py-1">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderQuotationCard = (quotation: QuotationWithItems | undefined, label: string, isOriginal: boolean) => {
    if (!quotation) return null;

    const borderColor = isOriginal ? 'border-destructive/30' : 'border-green-500/30';
    const bgColor = isOriginal ? 'bg-destructive/5' : 'bg-green-500/5';
    const headerColor = isOriginal ? 'text-destructive' : 'text-green-600 dark:text-green-400';
    const highlightColor = isOriginal ? 'text-destructive font-medium' : 'text-green-600 font-medium';

    const fields = [
      { key: 'customer_name', label: 'Customer' },
      { key: 'customer_email', label: 'Email' },
      { key: 'customer_phone', label: 'Phone' },
      { key: 'valid_from', label: 'Valid From', format: (v: string) => format(new Date(v), 'MMM d, yyyy') },
      { key: 'valid_until', label: 'Valid Until', format: (v: string) => format(new Date(v), 'MMM d, yyyy') },
      { key: 'discount_percent', label: 'Discount', format: (v: number) => `${v}%` },
      { key: 'tax_percent', label: 'Tax', format: (v: number) => `${v}%` },
      { key: 'subtotal', label: 'Subtotal', format: (v: number) => formatCurrency(v) },
      { key: 'total', label: 'Total', format: (v: number) => formatCurrency(v), bold: true },
    ];

    return (
      <div className={`rounded-lg border p-4 ${borderColor} ${bgColor}`}>
        <h4 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${headerColor}`}>{label}</h4>
        <div className="space-y-2 text-sm">
          {fields.map(({ key, label, format: fmt, bold }) => {
            const value = (quotation as unknown as Record<string, unknown>)[key];
            if (value === null || value === undefined) return null;
            const displayed = fmt ? (fmt as (v: any) => string)(value) : String(value);
            return (
              <div key={key} className={`grid grid-cols-2 gap-2 ${bold ? 'font-semibold' : ''}`}>
                <span className="text-muted-foreground">{label}:</span>
                <span className={changedFields.has(key) ? highlightColor : ''}>{displayed}</span>
              </div>
            );
          })}
          {quotation.notes && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground block mb-1">Notes:</span>
              <span className={changedFields.has('notes') ? highlightColor : ''}>{quotation.notes}</span>
            </div>
          )}
        </div>

        {/* Items section */}
        <div className="mt-4 pt-3 border-t">
          <h5 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${changedFields.has('items') ? headerColor : 'text-muted-foreground'}`}>
            Items ({quotation.items.length})
          </h5>
          {renderItemsTable(quotation.items, changedFields.has('items') ? (isOriginal ? 'red' : 'green') : 'none')}
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
                  <div className="grid grid-cols-2 gap-4">
                    {renderQuotationCard(originalQuotation, 'Original (First Created)', true)}
                    {renderQuotationCard(currentQuotation, 'Current (Final Version)', false)}
                  </div>

                  {/* Changes summary */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h4 className="font-semibold mb-3">Changes Summary</h4>
                    <div className="space-y-2">
                      {Array.from(changedFields).filter(f => f !== 'items').map(field => {
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
                      {changedFields.has('items') && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">Items</Badge>
                          <span className="text-muted-foreground">Item details changed (see above for full comparison)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <div className="space-y-4">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="rounded-lg border bg-card overflow-hidden">
                      <div className="flex justify-between items-center p-3 bg-muted/50 border-b">
                        <Badge variant="outline">Edit #{history.length - index}</Badge>
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
                              if (field === 'items' && Array.isArray(typedChange.old)) {
                                return (
                                  <div key={field}>
                                    <span className="text-muted-foreground text-sm">Items:</span>
                                    {renderItemsTable(typedChange.old as QuotationItem[], 'red')}
                                  </div>
                                );
                              }
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
                              if (field === 'items' && Array.isArray(typedChange.new)) {
                                return (
                                  <div key={field}>
                                    <span className="text-muted-foreground text-sm">Items:</span>
                                    {renderItemsTable(typedChange.new as QuotationItem[], 'green')}
                                  </div>
                                );
                              }
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
