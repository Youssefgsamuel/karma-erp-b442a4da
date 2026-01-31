import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useProductAssignments, ProductAssignment } from '@/hooks/useProductAssignments';
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

const statusColors: Record<ProductAssignment['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_production: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function AssignedQuantityDialog({
  open,
  onOpenChange,
  productId,
  productName,
  assignedQuantity,
}: AssignedQuantityDialogProps) {
  const { data: assignments = [], isLoading } = useProductAssignments(productId);

  // Filter to show only pending and in_production
  const activeAssignments = assignments.filter(a => a.status !== 'completed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigned Quantity: {formatNumber(assignedQuantity)}</DialogTitle>
          <DialogDescription>
            Assignments for {productName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeAssignments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No active assignments</p>
        ) : (
          <div className="space-y-3">
            {activeAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {assignment.quotation && (
                      <span className="font-medium text-primary">
                        {assignment.quotation.quotation_number}
                      </span>
                    )}
                    {assignment.manufacturing_order && (
                      <span className="font-medium text-blue-600">
                        → {assignment.manufacturing_order.mo_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(assignment.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatNumber(assignment.quantity)}</span>
                  <Badge className={statusColors[assignment.status]}>
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
