import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useRawMaterialTransactions } from '@/hooks/useRawMaterialTransactions';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Settings2 } from 'lucide-react';
import type { RawMaterial } from '@/types/erp';

interface TransactionHistoryDialogProps {
  material: RawMaterial | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionHistoryDialog({ material, isOpen, onOpenChange }: TransactionHistoryDialogProps) {
  const { data: transactions = [], isLoading } = useRawMaterialTransactions(material?.id || '');

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'out':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Settings2 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">IN</Badge>;
      case 'out':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">OUT</Badge>;
      default:
        return <Badge variant="outline">ADJ</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transaction History
          </DialogTitle>
          <DialogDescription>
            {material ? `${material.name} (${material.sku})` : 'No material selected'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found for this material.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      {getTransactionBadge(transaction.transaction_type)}
                      <span className="font-medium">
                        {transaction.transaction_type === 'out' ? '-' : '+'}
                        {transaction.quantity} {material?.unit}
                      </span>
                    </div>
                    {transaction.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{transaction.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transaction.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}