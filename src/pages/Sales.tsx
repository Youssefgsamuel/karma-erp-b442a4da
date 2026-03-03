import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { useLanguage } from '@/contexts/LanguageContext';

interface SalesOrder {
  id: string;
  order_number: string;
  quotation_id: string | null;
  customer_id: string | null;
  customer_name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'confirmed' | 'ready_to_deliver' | 'completed';
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
  ready_to_deliver: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  completed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const statusIcons: Record<SalesOrder['status'], React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  processing: <Package className="h-3 w-3" />,
  shipped: <ShoppingCart className="h-3 w-3" />,
  delivered: <CheckCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  confirmed: <CheckCircle className="h-3 w-3" />,
  ready_to_deliver: <Package className="h-3 w-3" />,
  completed: <Package className="h-3 w-3" />,
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
    mutationFn: async ({ id, status, orderNumber }: { id: string; status: SalesOrder['status']; orderNumber?: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Release assigned quantities, deduct stock, and send notifications when shipped
      if (status === 'shipped') {
        const { processShipment } = await import('@/hooks/useShipmentNotifications');
        await processShipment(id, orderNumber || data.order_number);
      }
      
      // Release assigned quantities when delivered or cancelled
      if (status === 'delivered' || status === 'cancelled') {
        const { releaseAssignmentsForSalesOrder } = await import('@/hooks/useAssignedQuantityManager');
        await releaseAssignmentsForSalesOrder(id);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      toast.success(variables.status === 'shipped' ? 'Order shipped' : 'Status updated');
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
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

function useRestoreSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_orders').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Sales order restored');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

function usePermanentDeleteSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Sales order permanently deleted');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}

export default function Sales() {
  const [activeTab, setActiveTab] = useState<'active' | 'recycled'>('active');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();
  
  const { data: orders = [], isLoading } = useSalesOrders(activeTab === 'recycled');
  const updateStatus = useUpdateSalesOrderStatus();
  const softDelete = useSoftDeleteSalesOrder();
  const restore = useRestoreSalesOrder();
  const permanentDelete = usePermanentDeleteSalesOrder();
  const [deleteConfirm, setDeleteConfirm] = useState<SalesOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (monthFilter !== 'all') {
        const orderMonth = new Date(order.order_date).getMonth();
        if (orderMonth !== parseInt(monthFilter)) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = order.order_number.toLowerCase().includes(q) ||
          order.customer_name.toLowerCase().includes(q) ||
          order.status.toLowerCase().includes(q) ||
          String(order.total).includes(q) ||
          (order.notes || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [orders, statusFilter, monthFilter, searchQuery]);

  const getStatusLabel = (status: SalesOrder['status']) => {
    const map: Record<SalesOrder['status'], string> = {
      pending: t.sales.pending,
      processing: t.sales.processing,
      ready_to_deliver: t.sales.readyToShip,
      completed: t.sales.readyToShip,
      shipped: t.sales.shipped,
      delivered: t.sales.delivered,
      cancelled: t.sales.cancelled,
      confirmed: t.sales.confirmed,
    };
    return map[status] || status;
  };

  const columns: Column<SalesOrder>[] = [
    { 
      key: 'order_number', 
      header: t.sales.orderNumber, 
      cell: (order) => <span className="font-medium">{order.order_number}</span> 
    },
    { 
      key: 'customer_name', 
      header: t.sales.customer, 
      cell: (order) => order.customer_name 
    },
    { 
      key: 'status', 
      header: t.status, 
      cell: (order) => (
        <Badge className={`${statusColors[order.status]} flex items-center gap-1 w-fit`}>
          {statusIcons[order.status]}
          {getStatusLabel(order.status)}
        </Badge>
      )
    },
    { 
      key: 'order_date', 
      header: t.sales.orderDate, 
      cell: (order) => format(new Date(order.order_date), 'MMM d, yyyy') 
    },
    { 
      key: 'due_date', 
      header: t.sales.dueDate, 
      cell: (order) => order.due_date ? format(new Date(order.due_date), 'MMM d, yyyy') : '-' 
    },
    { 
      key: 'total', 
      header: t.total, 
      cell: (order) => <span className="font-medium">${Number(order.total).toFixed(2)}</span> 
    },
    { 
      key: 'actions', 
      header: '', 
      cell: (order) => activeTab === 'recycled' ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => restore.mutate(order.id)}>
            <RotateCcw className="mr-1 h-3 w-3" /> {t.restore}
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setDeleteConfirm(order)}
          >
            <Trash2 className="mr-1 h-3 w-3" /> {t.deleteForever}
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
                <Package className="mr-2 h-4 w-4" /> {t.sales.startProcessing}
              </DropdownMenuItem>
            )}
            {(order.status === 'processing' || order.status === 'ready_to_deliver' || order.status === 'completed') && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: 'shipped', orderNumber: order.order_number })}>
                <ShoppingCart className="mr-2 h-4 w-4" /> {t.sales.shipOrder}
              </DropdownMenuItem>
            )}
            {order.status === 'shipped' && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}>
                <CheckCircle className="mr-2 h-4 w-4" /> {t.sales.markDelivered}
              </DropdownMenuItem>
            )}
            {(order.status === 'pending' || order.status === 'processing') && (
              <DropdownMenuItem 
                onClick={() => updateStatus.mutate({ id: order.id, status: 'cancelled' })}
                className="text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" /> {t.sales.cancelOrder}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => softDelete.mutate(order.id)} 
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t.moveToRecycleBin}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t.sales.title}
        description={t.sales.description}
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.sales.searchOrders}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'recycled')}>
        <TabsList className="mb-4">
          <TabsTrigger value="active">{t.sales.activeOrders}</TabsTrigger>
          <TabsTrigger value="recycled">{t.recycleBin}</TabsTrigger>
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
            emptyMessage={t.sales.noOrders}
          />
        </TabsContent>

        <TabsContent value="recycled">
          <DataTable
            columns={columns}
            data={filteredOrders}
            keyExtractor={(order) => order.id}
            isLoading={isLoading}
            emptyMessage={t.recycleBin}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.sales.permanentlyDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.sales.permanentDeleteWarning} "{deleteConfirm?.order_number}". {t.sales.cannotBeUndone}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm) {
                  permanentDelete.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.deleteForever}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
