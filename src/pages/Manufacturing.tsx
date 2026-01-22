import { useState, useEffect } from 'react';
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
import { Plus, MoreHorizontal, Play, CheckCircle, XCircle, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useManufacturingOrders, useCreateManufacturingOrder, useUpdateManufacturingOrder, useDeleteManufacturingOrder, ManufacturingOrder, CreateMOInput } from '@/hooks/useManufacturingOrders';
import { useProducts } from '@/hooks/useProducts';
import { useBomAvailability } from '@/hooks/useBomAvailability';
import { format } from 'date-fns';

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

export default function Manufacturing() {
  const { data: orders = [], isLoading } = useManufacturingOrders();
  const { data: products = [] } = useProducts();
  const createMO = useCreateManufacturingOrder();
  const updateMO = useUpdateManufacturingOrder();
  const deleteMO = useDeleteManufacturingOrder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateMOInput>({
    product_id: '',
    quantity: 1,
    priority: 'normal',
    planned_start: new Date().toISOString().split('T')[0],
    planned_end: '',
    notes: '',
  });

  // BOM availability check
  const { data: bomAvailability, isLoading: isCheckingAvailability } = useBomAvailability(
    formData.product_id,
    formData.quantity
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMO.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({
      product_id: '',
      quantity: 1,
      priority: 'normal',
      planned_start: new Date().toISOString().split('T')[0],
      planned_end: '',
      notes: '',
    });
  };

  const columns: Column<ManufacturingOrder>[] = [
    { key: 'mo_number', header: 'MO Number', cell: (mo) => <span className="font-medium">{mo.mo_number}</span> },
    { key: 'product', header: 'Product', cell: (mo) => mo.product?.name || 'Unknown' },
    { key: 'quantity', header: 'Quantity', cell: (mo) => mo.quantity },
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Manufacturing Order</DialogTitle>
            <DialogDescription>Create a new manufacturing order to produce products.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select 
                value={formData.product_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, product_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  required
                />
              </div>
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
            {formData.product_id && bomAvailability && (
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
              <Button type="submit" disabled={createMO.isPending || !formData.product_id}>
                {createMO.isPending ? 'Creating...' : 'Create MO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
