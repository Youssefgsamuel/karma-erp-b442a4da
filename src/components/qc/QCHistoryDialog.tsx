import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';

interface QCHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moId: string;
  moNumber: string;
}

interface QCRecord {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  rejection_reason: string | null;
  notes: string | null;
  inspected_at: string | null;
  created_at: string;
  product: { name: string; sku: string } | null;
  inspector: { full_name: string } | null;
}

function useQCHistoryByMO(moId: string) {
  return useQuery({
    queryKey: ['qc-history', moId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quality_control_records')
        .select('*, product:products(name, sku), inspector:profiles!quality_control_records_inspector_id_fkey(full_name)')
        .eq('mo_id', moId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as QCRecord[];
    },
    enabled: !!moId,
  });
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  under_review: { icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  accepted: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  rejected: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function QCHistoryDialog({
  open,
  onOpenChange,
  moId,
  moNumber,
}: QCHistoryDialogProps) {
  const { data: records = [], isLoading } = useQCHistoryByMO(moId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>QC History - {moNumber}</DialogTitle>
          <DialogDescription>
            Quality control records for this manufacturing order
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No QC records found</p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const config = statusConfig[record.status] || statusConfig.under_review;
                return (
                  <div
                    key={record.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">{record.product?.name || 'Unknown Product'}</p>
                        <p className="text-xs text-muted-foreground">{record.product?.sku}</p>
                      </div>
                      <Badge className={`${config.color} flex items-center gap-1`}>
                        {config.icon}
                        {record.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="ml-2 font-medium">{formatNumber(record.quantity)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Inspector:</span>
                        <span className="ml-2">{record.inspector?.full_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="ml-2">{format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Inspected:</span>
                        <span className="ml-2">
                          {record.inspected_at ? format(new Date(record.inspected_at), 'MMM d, yyyy HH:mm') : '-'}
                        </span>
                      </div>
                    </div>

                    {record.rejection_reason && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                        <span className="text-red-600 dark:text-red-400 font-medium">Rejection Reason:</span>
                        <p className="text-red-700 dark:text-red-300 mt-1">{record.rejection_reason}</p>
                      </div>
                    )}

                    {record.notes && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1">{record.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
