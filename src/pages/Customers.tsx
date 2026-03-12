import { useState } from 'react';
import { useCustomersWithStats, useCreateCustomer, useCustomerInteractions, useCreateInteraction, type CustomerWithStats } from '@/hooks/useCustomers';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Users, DollarSign, TrendingUp, MessageSquare, Phone, Mail, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { format } from 'date-fns';

const INTERACTION_TYPES = ['call', 'email', 'meeting', 'note', 'follow_up'] as const;

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomersWithStats();
  const createCustomer = useCreateCustomer();
  const createInteraction = useCreateInteraction();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [isInteractionOpen, setIsInteractionOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [interactionForm, setInteractionForm] = useState({ interaction_type: 'note', subject: '', notes: '' });

  const { data: interactions = [] } = useCustomerInteractions(selectedCustomer?.id || null);

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  const totalRevenue = customers.reduce((s, c) => s + c.total_revenue, 0);
  const totalOutstanding = customers.reduce((s, c) => s + c.outstanding_balance, 0);
  const totalCustomers = customers.length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomer.mutateAsync(formData);
    setIsCreateOpen(false);
    setFormData({ name: '', email: '', phone: '', address: '' });
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    await createInteraction.mutateAsync({
      customer_id: selectedCustomer.id,
      ...interactionForm,
    });
    setIsInteractionOpen(false);
    setInteractionForm({ interaction_type: 'note', subject: '', notes: '' });
  };

  const columns: Column<CustomerWithStats>[] = [
    {
      key: 'name', header: 'Customer', cell: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (c) => c.phone || '-' },
    { key: 'orders', header: 'Orders', cell: (c) => <span className="font-medium">{c.total_orders}</span> },
    { key: 'revenue', header: 'Revenue', cell: (c) => <span className="font-medium">{formatCurrency(c.total_revenue)}</span> },
    { key: 'outstanding', header: 'Outstanding', cell: (c) => (
      <span className={c.outstanding_balance > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}>
        {formatCurrency(c.outstanding_balance)}
      </span>
    )},
    { key: 'interactions', header: 'Interactions', cell: (c) => c.interactions_count },
    {
      key: 'actions', header: '', cell: (c) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(c)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customers"
        description="Manage customer relationships and track interactions."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCustomers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <TrendingUp className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Revenue/Customer</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalCustomers > 0 ? totalRevenue / totalCustomers : 0)}</div></CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} keyExtractor={(c) => c.id} isLoading={isLoading} emptyMessage="No customers yet." />

      {/* Create Customer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader><DialogTitle>Add Customer</DialogTitle><DialogDescription>Create a new customer profile.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Textarea value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCustomer.isPending}>{createCustomer.isPending ? 'Creating...' : 'Add Customer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name}</DialogTitle>
            <DialogDescription>Customer profile and interaction history</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedCustomer.total_revenue)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-sm text-muted-foreground">Orders</p>
                  <p className="text-lg font-bold">{selectedCustomer.total_orders}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(selectedCustomer.outstanding_balance)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Interactions</h3>
                <Button size="sm" onClick={() => setIsInteractionOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Log Interaction
                </Button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {interactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No interactions logged yet.</p>
                ) : (
                  interactions.map((i) => (
                    <div key={i.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        {i.interaction_type === 'call' ? <Phone className="h-4 w-4 text-primary" /> :
                         i.interaction_type === 'email' ? <Mail className="h-4 w-4 text-primary" /> :
                         <MessageSquare className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{i.interaction_type}</Badge>
                          {i.subject && <span className="font-medium text-sm">{i.subject}</span>}
                        </div>
                        {i.notes && <p className="text-sm text-muted-foreground mt-1">{i.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {format(new Date(i.contact_date), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Interaction Dialog */}
      <Dialog open={isInteractionOpen} onOpenChange={setIsInteractionOpen}>
        <DialogContent>
          <form onSubmit={handleAddInteraction}>
            <DialogHeader><DialogTitle>Log Interaction</DialogTitle><DialogDescription>Record a customer interaction.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={interactionForm.interaction_type} onValueChange={(v) => setInteractionForm((p) => ({ ...p, interaction_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => (<SelectItem key={t} value={t}>{t.replace('_', ' ').charAt(0).toUpperCase() + t.replace('_', ' ').slice(1)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Subject</Label><Input value={interactionForm.subject} onChange={(e) => setInteractionForm((p) => ({ ...p, subject: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={interactionForm.notes} onChange={(e) => setInteractionForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInteractionOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createInteraction.isPending}>{createInteraction.isPending ? 'Saving...' : 'Log Interaction'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
