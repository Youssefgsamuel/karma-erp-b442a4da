import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, Package, CheckCircle, Clock, XCircle, ShoppingCart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SalesOrder {
  id: string;
  order_number: string;
  quotation_id: string | null;
  customer_id: string | null;
  customer_name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  order_date: string;
  due_date: string | null;
  subtotal: number;
  discount_percent: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<SalesOrder['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusIcons: Record<SalesOrder['status'], React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  processing: <Package className="h-3 w-3" />,
  shipped: <ShoppingCart className="h-3 w-3" />,
  delivered: <CheckCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

function useSalesOrders() {
  return useQuery({
    queryKey: ['sales_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SalesOrder[];
    },
  });
}

function useUpdateSalesOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SalesOrder['status'] }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Order status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

function useDeleteSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Sales order deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });
}

export default function Sales() {
  const { data: orders = [], isLoading } = useSalesOrders();
  const updateStatus = useUpdateSalesOrderStatus();
  const deleteOrder = useDeleteSalesOrder();
  const [deleteConfirm, setDeleteConfirm] = useState<SalesOrder | null>(null);

  const columns: Column<SalesOrder>[] = [
    { 
      key: 'order_number', 
      header: 'Order #', 
      cell: (order) => <span className="font-medium">{order.order_number}</span> 
    },
    { 
      key: 'customer_name', 
      header: 'Customer', 
      cell: (order) => order.customer_name 
    },
    { 
      key: 'status', 
      header: 'Status', 
      cell: (order) => (
        <Badge className={`${statusColors[order.status]} flex items-center gap-1 w-fit`}>
          {statusIcons[order.status]}
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      )
    },
    { 
      key: 'order_date', 
      header: 'Order Date', 
      cell: (order) => format(new Date(order.order_date), 'MMM d, yyyy') 
    },
    { 
      key: 'due_date', 
      header: 'Due Date', 
      cell: (order) => order.due_date ? format(new Date(order.due_date), 'MMM d, yyyy') : '-' 
    },
    { 
      key: 'total', 
      header: 'Total', 
      cell: (order) => <span className="font-medium">${Number(order.total).toFixed(2)}</span> 
    },
    { 
      key: 'actions', 
      header: '', 
      cell: (order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {order.status === 'pending' && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: 'processing' })}>
                <Package className="mr-2 h-4 w-4" /> Start Processing
              </DropdownMenuItem>
            )}
            {order.status === 'processing' && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: 'shipped' })}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Mark Shipped
              </DropdownMenuItem>
            )}
            {order.status === 'shipped' && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}>
                <CheckCircle className="mr-2 h-4 w-4" /> Mark Delivered
              </DropdownMenuItem>
            )}
            {(order.status === 'pending' || order.status === 'processing') && (
              <DropdownMenuItem 
                onClick={() => updateStatus.mutate({ id: order.id, status: 'cancelled' })}
                className="text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel Order
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => setDeleteConfirm(order)} 
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Sales Orders"
        description="Manage and track your sales orders."
      />

      <DataTable
        columns={columns}
        data={orders}
        keyExtractor={(order) => order.id}
        isLoading={isLoading}
        emptyMessage="No sales orders yet. Convert a quotation to create a sales order."
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order "{deleteConfirm?.order_number}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm) {
                  deleteOrder.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}