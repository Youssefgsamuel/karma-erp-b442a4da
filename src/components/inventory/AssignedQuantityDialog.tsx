import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AssignedQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  assignedQuantity: number;
}

interface QuotationAssignment {
  id: string;
  quotation_id: string | null;
  quotation_number: string | null;
  quantity: number;
  status: string;
  created_at: string;
}

function useQuotationAssignments(productId: string) {
  return useQuery({
    queryKey: ['quotation-assignments', productId],
    queryFn: async () => {
      // Get all quotation items for this product that aren't completed/cancelled
      const { data: quotationItems, error } = await supabase
        .from('quotation_items')
        .select(`
          id,
          quantity,
          created_at,
          quotation:quotations!inner(
            id,
            quotation_number,
            status
          )
        `)
        .eq('product_id', productId);
      
      if (error) throw error;

      // Filter to only include active quotations (not rejected, expired, or converted)
      const activeItems = (quotationItems || []).filter((item: any) => {
        const status = item.quotation?.status;
        return status === 'draft' || status === 'sent' || status === 'accepted';
      });

      return activeItems.map((item: any) => ({
        id: item.id,
        quotation_id: item.quotation?.id,
        quotation_number: item.quotation?.quotation_number,
        quantity: item.quantity,
        status: item.quotation?.status || 'unknown',
        created_at: item.created_at,
      })) as QuotationAssignment[];
    },
    enabled: !!productId,
  });
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function AssignedQuantityDialog({
  open,
  onOpenChange,
  productId,
  productName,
  assignedQuantity,
}: AssignedQuantityDialogProps) {
  const { data: assignments = [], isLoading } = useQuotationAssignments(productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigned Quantity: {formatNumber(assignedQuantity)}</DialogTitle>
          <DialogDescription>
            Quotations containing {productName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No active quotations for this product</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="space-y-1">
                  <span className="font-medium text-primary">
                    {assignment.quotation_number}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(assignment.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatNumber(assignment.quantity)} pcs</span>
                  <Badge className={statusColors[assignment.status] || 'bg-muted'}>
                    {assignment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
