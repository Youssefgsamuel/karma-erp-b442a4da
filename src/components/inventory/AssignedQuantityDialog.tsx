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

interface AssignmentRow {
  id: string;
  quantity: number;
  status: string;
  created_at: string;
  quotation_number: string | null;
  mo_number: string | null;
}

function useActiveAssignments(productId: string) {
  return useQuery({
    queryKey: ['active-assignments', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_assignments')
        .select(`
          id,
          quantity,
          status,
          created_at,
          quotation:quotations(quotation_number),
          manufacturing_order:manufacturing_orders(mo_number)
        `)
        .eq('product_id', productId)
        .in('status', ['pending', 'in_production'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        status: item.status,
        created_at: item.created_at,
        quotation_number: item.quotation?.quotation_number || null,
        mo_number: item.manufacturing_order?.mo_number || null,
      })) as AssignmentRow[];
    },
    enabled: !!productId,
  });
}

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_production: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export function AssignedQuantityDialog({
  open,
  onOpenChange,
  productId,
  productName,
  assignedQuantity,
}: AssignedQuantityDialogProps) {
  const { data: assignments = [], isLoading } = useActiveAssignments(productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigned Quantity: {formatNumber(assignedQuantity)}</DialogTitle>
          <DialogDescription>
            Active assignments for {productName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No active assignments for this product</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="space-y-1">
                  {assignment.quotation_number && (
                    <span className="font-medium text-primary">
                      {assignment.quotation_number}
                    </span>
                  )}
                  {assignment.mo_number && (
                    <span className="font-medium text-primary block">
                      {assignment.mo_number}
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(assignment.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatNumber(assignment.quantity)} pcs</span>
                  <Badge className={statusColors[assignment.status] || 'bg-muted'}>
                    {assignment.status.replace('_', ' ')}
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
