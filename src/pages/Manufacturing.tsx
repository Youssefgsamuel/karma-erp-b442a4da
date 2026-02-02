import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Play, CheckCircle, XCircle, Trash2, AlertTriangle, CheckCircle2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { useManufacturingOrders, useCreateManufacturingOrder, useUpdateManufacturingOrder, useDeleteManufacturingOrder, ManufacturingOrder } from '@/hooks/useManufacturingOrders';
import { useMoItems, useAllMoItems, useCreateMoItems, useUpdateMoItemStatus, MoItemWithProduct } from '@/hooks/useMoItems';
import { useProducts } from '@/hooks/useProducts';
import { useBomAvailability } from '@/hooks/useBomAvailability';
import { MoProductsDialog } from '@/components/manufacturing/MoProductsDialog';
import { MoQuantityDialog } from '@/components/manufacturing/MoQuantityDialog';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';

const statusColors: Record<ManufacturingOrder['status'], string> = {
  planned: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  under_qc: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  qc_rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const priorityColors: Record<ManufacturingOrder['priority'], string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const itemStatusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

interface MoItemLine {
  product_id: string;
  quantity: number;
  notes?: string;
}

// Extended MO type with item counts
interface MOWithCounts extends ManufacturingOrder {
  productCount: number;
  totalQuantity: number;
  moItems: MoItemWithProduct[];
}

export default function Manufacturing() {
  const { data: allOrders = [], isLoading } = useManufacturingOrders();
  
  // Filter out orders that have moved to QC workflow (under_qc, closed, qc_rejected)
  const filteredOrders = allOrders.filter(mo => 
    !['under_qc', 'closed', 'qc_rejected'].includes(mo.status)
  );
  const { data: products = [] } = useProducts();
  const createMO = useCreateManufacturingOrder();
  const updateMO = useUpdateManufacturingOrder();
  const deleteMO = useDeleteManufacturingOrder();
  const createMoItems = useCreateMoItems();
  const updateItemStatus = useUpdateMoItemStatus();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [selectedMO, setSelectedMO] = useState<MOWithCounts | null>(null);
  
  // Dialogs for products and quantity
  const [productsDialogMO, setProductsDialogMO] = useState<MOWithCounts | null>(null);
  const [quantityDialogMO, setQuantityDialogMO] = useState<MOWithCounts | null>(null);
  
  // All items form state (no primary product)
  const [moItems, setMoItems] = useState<MoItemLine[]>([{ product_id: '', quantity: 1, notes: '' }]);
  const [formData, setFormData] = useState({
    priority: 'normal' as ManufacturingOrder['priority'],
    planned_start: new Date().toISOString().split('T')[0],
    planned_end: '',
    notes: '',
  });

  // Fetch all MO items in a single query
  const { data: allMoItems = [] } = useAllMoItems(filteredOrders.map(mo => mo.id));
  
  // Create a map of MO ID to its items
  const moItemsMap = useMemo(() => {
    const map: Record<string, MoItemWithProduct[]> = {};
    filteredOrders.forEach((mo) => {
      map[mo.id] = allMoItems.filter(item => item.mo_id === mo.id);
    });
    return map;
  }, [filteredOrders, allMoItems]);

  // Enrich orders with counts
  const orders: MOWithCounts[] = useMemo(() => {
    return filteredOrders.map(mo => {
      const items = moItemsMap[mo.id] || [];
      // Primary product counts as 1, plus all mo_items
      const productCount = 1 + items.length;
      // Sum of primary quantity + all item quantities
      const totalQuantity = Number(mo.quantity) + items.reduce((sum, item) => sum + Number(item.quantity), 0);
      return {
        ...mo,
        productCount,
        totalQuantity,
        moItems: items,
      };
    });
  }, [filteredOrders, moItemsMap]);

  // Fetch MO items for selected MO
  const { data: selectedMoItems = [] } = useMoItems(selectedMO?.id || '');

  // BOM availability check for first item
  const firstItemProductId = moItems[0]?.product_id || '';
  const firstItemQuantity = moItems[0]?.quantity || 1;
  const { data: bomAvailability } = useBomAvailability(
    firstItemProductId,
    firstItemQuantity
  );

  const handleAddItemLine = () => {
    setMoItems(prev => [...prev, { product_id: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveItemLine = (index: number) => {
    setMoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemLineChange = (index: number, field: keyof MoItemLine, value: string | number) => {
    setMoItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleViewItems = (mo: MOWithCounts) => {
    setSelectedMO(mo);
    setIsItemsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter valid items
    const validItems = moItems.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    // Use first item as the MO's primary product
    const firstItem = validItems[0];
    
    // Create the MO with the first product
    const moData = await createMO.mutateAsync({
      product_id: firstItem.product_id,
      quantity: firstItem.quantity,
      priority: formData.priority,
      planned_start: formData.planned_start,
      planned_end: formData.planned_end,
      notes: formData.notes,
    });

    // If there are additional items, create them as mo_items
    if (validItems.length > 1 && moData?.id) {
      await createMoItems.mutateAsync(
        validItems.slice(1).map(item => ({
          mo_id: moData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes,
        }))
      );
    }

    setIsDialogOpen(false);
    setFormData({
      priority: 'normal',
      planned_start: new Date().toISOString().split('T')[0],
      planned_end: '',
      notes: '',
    });
    setMoItems([{ product_id: '', quantity: 1, notes: '' }]);
  };

  const handleItemStatusChange = async (item: MoItemWithProduct, newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!selectedMO) return;
    await updateItemStatus.mutateAsync({
      itemId: item.id,
      status: newStatus,
      moId: selectedMO.id,
    });
  };

  const columns: Column<MOWithCounts>[] = [
    { key: 'mo_number', header: 'MO Number', cell: (mo) => (
      <button
        className="font-medium hover:underline cursor-pointer text-left"
        onClick={() => handleViewItems(mo)}
      >
        {mo.mo_number}
      </button>
    )},
    { key: 'products', header: 'Products', cell: (mo) => (
      <button
        className="font-medium text-primary hover:underline cursor-pointer"
        onClick={() => setProductsDialogMO(mo)}
      >
        {mo.productCount} {mo.productCount === 1 ? 'product' : 'products'}
      </button>
    )},
    { key: 'quantity', header: 'Total Qty', cell: (mo) => (
      <button
        className="font-medium text-primary hover:underline cursor-pointer"
        onClick={() => setQuantityDialogMO(mo)}
      >
        {formatNumber(mo.totalQuantity)}
      </button>
    )},
    { key: 'status', header: 'Status', cell: (mo) => (
      <Badge className={statusColors[mo.status]}>{mo.status.replace('_', ' ')}</Badge>
    )},
    { key: 'priority', header: 'Priority', cell: (mo) => (
      <Badge className={priorityColors[mo.priority]}>{mo.priority}</Badge>
    )},
    { key: 'planned_start', header: 'Planned Start', cell: (mo) => mo.planned_start ? format(new Date(mo.planned_start), 'MMM d, yyyy') : '-' },
    { key: 'planned_end', header: 'Planned End', cell: (mo) => mo.planned_end ? format(new Date(mo.planned_end), 'MMM d, yyyy') : '-' },
    { key: 'actions', header: '', cell: (mo) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleViewItems(mo)}>
            <ListChecks className="mr-2 h-4 w-4" /> View Items
          </DropdownMenuItem>
          {mo.status === 'planned' && (
            <DropdownMenuItem onClick={() => updateMO.mutate({ id: mo.id, status: 'in_progress' })}>
              <Play className="mr-2 h-4 w-4" /> Start Production
            </DropdownMenuItem>
          )}
          {mo.status === 'in_progress' && (
            <DropdownMenuItem onClick={() => updateMO.mutate({ id: mo.id, status: 'completed' })}>
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Complete (Send to QC)
            </DropdownMenuItem>
          )}
          {(mo.status === 'planned' || mo.status === 'in_progress') && (
            <DropdownMenuItem onClick={() => updateMO.mutate({ id: mo.id, status: 'cancelled' })} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </DropdownMenuItem>
          )}
          {(mo.status === 'planned' || mo.status === 'cancelled' || mo.status === 'qc_rejected') && (
            <DropdownMenuItem onClick={() => deleteMO.mutate(mo.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Manufacturing Orders"
        description="Manage production orders and track manufacturing progress."
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New MO
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={orders}
        keyExtractor={(mo) => mo.id}
        isLoading={isLoading}
        emptyMessage="No manufacturing orders yet. Create your first MO."
      />

      {/* Create MO Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Manufacturing Order</DialogTitle>
            <DialogDescription>Create a new manufacturing order with one or more products.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* All Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Products *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItemLine}>
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              </div>
              <div className="space-y-2 border rounded-lg p-3">
                {moItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Select 
                      value={item.product_id} 
                      onValueChange={(v) => handleItemLineChange(index, 'product_id', v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemLineChange(index, 'quantity', Number(e.target.value))}
                      className="w-20"
                    />
                    {moItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItemLine(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as ManufacturingOrder['priority'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planned_start">Planned Start</Label>
                <Input
                  id="planned_start"
                  type="date"
                  value={formData.planned_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, planned_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planned_end">Planned End</Label>
                <Input
                  id="planned_end"
                  type="date"
                  value={formData.planned_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, planned_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* BOM Availability Check */}
            {firstItemProductId && bomAvailability && (
              <div className={`rounded-lg p-4 ${bomAvailability.is_fully_available ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {bomAvailability.is_fully_available ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">Materials Available</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-700 dark:text-yellow-400">
                        {bomAvailability.has_bom ? 'Insufficient Materials' : 'No BOM Defined'}
                      </span>
                    </>
                  )}
                </div>
                {bomAvailability.has_bom && bomAvailability.materials.length > 0 && (
                  <div className="text-sm space-y-1">
                    {bomAvailability.materials.map((m) => (
                      <div key={m.raw_material_id} className="flex justify-between items-center">
                        <span className={m.is_available ? 'text-muted-foreground' : 'text-yellow-700 dark:text-yellow-400'}>
                          {m.raw_material_name}
                        </span>
                        <span className={m.is_available ? 'text-green-600' : 'text-red-600'}>
                          {m.available_quantity} / {m.required_quantity} {m.is_available ? '✓' : `(need ${m.shortage} more)`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {!bomAvailability.has_bom && (
                  <p className="text-sm text-muted-foreground">
                    No Bill of Materials defined for this product. Add materials in the BOM page.
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMO.isPending || !firstItemProductId}>
                {createMO.isPending ? 'Creating...' : 'Create MO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MO Items Dialog */}
      <Dialog open={isItemsDialogOpen} onOpenChange={setIsItemsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MO Items - {selectedMO?.mo_number}</DialogTitle>
            <DialogDescription>
              View and manage all items in this manufacturing order. All products have equal priority.
            </DialogDescription>
          </DialogHeader>

          {selectedMO && (
            <div className="space-y-4">
              {/* All Items - including the "primary" which is just the first item */}
              <div className="space-y-2">
                <Label>Items ({1 + selectedMoItems.length})</Label>
                <div className="space-y-2">
                  {/* First item (from MO itself) */}
                  <div className="rounded-lg border p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{selectedMO.product?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {selectedMO.quantity}</p>
                    </div>
                    <Badge className={statusColors[selectedMO.status]}>
                      {selectedMO.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Additional items */}
                  {selectedMoItems.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={itemStatusColors[item.status]}>
                          {item.status}
                        </Badge>
                        {selectedMO.status === 'in_progress' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.status !== 'in_progress' && (
                                <DropdownMenuItem onClick={() => handleItemStatusChange(item, 'in_progress')}>
                                  <Play className="mr-2 h-4 w-4" /> Start
                                </DropdownMenuItem>
                              )}
                              {item.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => handleItemStatusChange(item, 'completed')}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Mark Complete
                                </DropdownMenuItem>
                              )}
                              {item.status !== 'pending' && (
                                <DropdownMenuItem onClick={() => handleItemStatusChange(item, 'pending')}>
                                  Reset to Pending
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Products Dialog */}
      <MoProductsDialog
        open={!!productsDialogMO}
        onOpenChange={(open) => !open && setProductsDialogMO(null)}
        mo={productsDialogMO}
        items={productsDialogMO?.moItems || []}
      />

      {/* Quantity Dialog */}
      <MoQuantityDialog
        open={!!quantityDialogMO}
        onOpenChange={(open) => !open && setQuantityDialogMO(null)}
        mo={quantityDialogMO}
        items={quantityDialogMO?.moItems || []}
      />
    </div>
  );
}
