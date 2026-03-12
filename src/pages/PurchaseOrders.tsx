import { useState } from 'react';
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePOStatus, useReceivePOItems, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useSuppliersWithStats } from '@/hooks/useSuppliers';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, MoreHorizontal, Send, PackageCheck, Lock, Trash2, Search, ShoppingCart, Clock, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function PurchaseOrdersPage() {
  const { data: pos = [], isLoading } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliersWithStats();
  const { data: materials = [] } = useRawMaterials();
  const createPO = useCreatePurchaseOrder();
  const updateStatus = useUpdatePOStatus();
  const receiveItems = useReceivePOItems();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [{ raw_material_id: '', description: '', quantity: 1, unit_cost: 0 }] as { raw_material_id: string; description: string; quantity: number; unit_cost: number }[],
  });

  const filteredPOs = pos.filter((po) => {
    const q = searchQuery.toLowerCase();
    return po.po_number.toLowerCase().includes(q) ||
      (po.supplier?.name || '').toLowerCase().includes(q) ||
      po.status.toLowerCase().includes(q);
  });

  const totalDraft = pos.filter((p) => p.status === 'draft').length;
  const totalSent = pos.filter((p) => p.status === 'sent').length;
  const totalValue = pos.reduce((s, p) => s + Number(p.total), 0);

  const addItem = () => setFormData((prev) => ({
    ...prev,
    items: [...prev.items, { raw_material_id: '', description: '', quantity: 1, unit_cost: 0 }],
  }));

  const removeItem = (idx: number) => setFormData((prev) => ({
    ...prev,
    items: prev.items.filter((_, i) => i !== idx),
  }));

  const updateItem = (idx: number, field: string, value: any) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      // Auto-fill description from material
      if (field === 'raw_material_id' && value) {
        const mat = materials.find((m) => m.id === value);
        if (mat) {
          items[idx].description = mat.name;
          items[idx].unit_cost = mat.cost_per_unit;
        }
      }
      return { ...prev, items };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPO.mutateAsync({
      supplier_id: formData.supplier_id,
      expected_date: formData.expected_date || undefined,
      notes: formData.notes || undefined,
      items: formData.items.filter((i) => i.description),
    });
    setIsCreateOpen(false);
    setFormData({ supplier_id: '', expected_date: '', notes: '', items: [{ raw_material_id: '', description: '', quantity: 1, unit_cost: 0 }] });
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'po_number', header: 'PO #', cell: (po) => <span className="font-medium font-mono">{po.po_number}</span> },
    { key: 'supplier', header: 'Supplier', cell: (po) => po.supplier?.name || '-' },
    {
      key: 'status', header: 'Status', cell: (po) => (
        <Badge className={statusColors[po.status] || ''}>
          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
        </Badge>
      ),
    },
    { key: 'order_date', header: 'Date', cell: (po) => format(new Date(po.order_date), 'MMM d, yyyy') },
    { key: 'expected', header: 'Expected', cell: (po) => po.expected_date ? format(new Date(po.expected_date), 'MMM d, yyyy') : '-' },
    { key: 'total', header: 'Total', cell: (po) => <span className="font-medium">{formatCurrency(Number(po.total))}</span> },
    {
      key: 'actions', header: '', cell: (po) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {po.status === 'draft' && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: 'sent' })}>
                <Send className="mr-2 h-4 w-4" /> Mark as Sent
              </DropdownMenuItem>
            )}
            {(po.status === 'sent' || po.status === 'partial') && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: 'received' })}>
                <PackageCheck className="mr-2 h-4 w-4" /> Mark as Received
              </DropdownMenuItem>
            )}
            {po.status === 'received' && (
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: po.id, status: 'closed' })}>
                <Lock className="mr-2 h-4 w-4" /> Close PO
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Purchase Orders"
        description="Manage purchase orders and supplier procurement."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create PO
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft POs</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalDraft}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent / Awaiting</CardTitle>
            <Clock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalSent}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <ShoppingCart className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalValue)}</div></CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search POs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      <DataTable columns={columns} data={filteredPOs} keyExtractor={(po) => po.id} isLoading={isLoading} emptyMessage="No purchase orders yet." />

      {/* Create PO Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>Create a new PO linked to a supplier.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={formData.supplier_id} onValueChange={(v) => setFormData((p) => ({ ...p, supplier_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Date</Label>
                  <Input type="date" value={formData.expected_date} onChange={(e) => setFormData((p) => ({ ...p, expected_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add Item</Button>
                </div>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-3">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Material</Label>
                      <Select value={item.raw_material_id} onValueChange={(v) => updateItem(idx, 'raw_material_id', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.sku})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input className="h-9" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} required />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input className="h-9" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input className="h-9" type="number" min={0} step="0.01" value={item.unit_cost} onChange={(e) => updateItem(idx, 'unit_cost', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(idx)} disabled={formData.items.length <= 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="text-right font-medium">
                  Total: {formatCurrency(formData.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPO.isPending || !formData.supplier_id}>
                {createPO.isPending ? 'Creating...' : 'Create PO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
