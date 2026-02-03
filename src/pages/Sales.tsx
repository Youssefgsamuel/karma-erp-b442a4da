import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, Package, CheckCircle, Clock, XCircle, ShoppingCart, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SalesFilters } from '@/components/sales/SalesFilters';

interface SalesOrder {
  id: string;
  order_number: string;
  quotation_id: string | null;
  customer_id: string | null;
  customer_name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'confirmed' | 'ready_to_deliver';
  order_date: string;
  due_date: string | null;
  subtotal: number;
  discount_percent: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

const statusColors: Record<SalesOrder['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  ready_to_deliver: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

const statusIcons: Record<SalesOrder['status'], React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  processing: <Package className="h-3 w-3" />,
  shipped: <ShoppingCart className="h-3 w-3" />,
  delivered: <CheckCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  confirmed: <CheckCircle className="h-3 w-3" />,
  ready_to_deliver: <Package className="h-3 w-3" />,
};

function useSalesOrders(includeDeleted = false) {
  return useQuery({
    queryKey: ['sales_orders', { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (includeDeleted) {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;
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

function useSoftDeleteSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Sales order moved to recycle bin');
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });
}

function useRestoreSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_orders')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Sales order restored');
    },
    onError: (error) => {
      toast.error(`Failed to restore order: ${error.message}`);
    },
  });
}

function usePermanentDeleteSalesOrder() {
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
      toast.success('Sales order permanently deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete order: ${error.message}`);
    },
  });
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState<'active' | 'recycled'>('active');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  
  const { data: orders = [], isLoading } = useSalesOrders(activeTab === 'recycled');
  const updateStatus = useUpdateSalesOrderStatus();
  const softDelete = useSoftDeleteSalesOrder();
  const restore = useRestoreSalesOrder();
  const permanentDelete = usePermanentDeleteSalesOrder();
  const [deleteConfirm, setDeleteConfirm] = useState<SalesOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      
      // Month filter
      if (monthFilter !== 'all') {
        const orderMonth = new Date(order.order_date).getMonth();
        if (orderMonth !== parseInt(monthFilter)) return false;
      }
      
      return true;
    });
  }, [orders, statusFilter, monthFilter]);

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
          {order.status.replace(/_/g, ' ').charAt(0).toUpperCase() + order.status.replace(/_/g, ' ').slice(1)}
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
      cell: (order) => activeTab === 'recycled' ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => restore.mutate(order.id)}>
            <RotateCcw className="mr-1 h-3 w-3" /> Restore
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setDeleteConfirm(order)}
          >
            <Trash2 className="mr-1 h-3 w-3" /> Delete Forever
          </Button>
        </div>
      ) : (
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
            {order.status === 'ready_to_deliver' && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: 'shipped' })}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Mark Shipped
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
              onClick={() => softDelete.mutate(order.id)} 
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Move to Recycle Bin
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'recycled')}>
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="recycled">Recycle Bin</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <SalesFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            monthFilter={monthFilter}
            onMonthChange={setMonthFilter}
          />
          <DataTable
            columns={columns}
            data={filteredOrders}
            keyExtractor={(order) => order.id}
            isLoading={isLoading}
            emptyMessage="No sales orders yet. Convert a quotation to create a sales order."
          />
        </TabsContent>

        <TabsContent value="recycled">
          <DataTable
            columns={columns}
            data={filteredOrders}
            keyExtractor={(order) => order.id}
            isLoading={isLoading}
            emptyMessage="Recycle bin is empty."
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Sales Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order "{deleteConfirm?.order_number}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm) {
                  permanentDelete.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
