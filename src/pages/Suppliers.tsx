import { useState, useMemo } from 'react';
import { useSuppliersWithStats, useCreateSupplier, useDeleteSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, Plus, MoreHorizontal, Pencil, Trash2, Search, Mail, Phone, ArrowUpDown } from 'lucide-react';
import type { SupplierWithStats } from '@/types/erp';
import { formatNumber, formatCurrency } from '@/lib/utils';

const PAYMENT_TERMS_OPTIONS = ['Cash', '30 days', '60 days', '90 days', 'Other'] as const;

const initialFormData = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  payment_terms: '',
  payment_terms_notes: '',
};

type SortField = 'name' | 'total_quantity' | 'total_spent';
type SortDirection = 'asc' | 'desc';

export default function Suppliers() {
  const { data: suppliers = [], isLoading } = useSuppliersWithStats();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [isOpen, setIsOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedSuppliers = useMemo(() => {
    const filtered = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'total_quantity') {
        comparison = a.total_quantity - b.total_quantity;
      } else if (sortField === 'total_spent') {
        comparison = a.total_spent - b.total_spent;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [suppliers, searchQuery, sortField, sortDirection]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSupplier(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleEdit = (supplier: SupplierWithStats) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      payment_terms: supplier.payment_terms || '',
      payment_terms_notes: supplier.payment_terms_notes || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, ...formData });
    } else {
      await createSupplier.mutateAsync(formData);
    }
    
    setIsOpen(false);
    resetForm();
  };

  const isSubmitting = createSupplier.isPending || updateSupplier.isPending;

  const columns: Column<SupplierWithStats>[] = [
    {
      key: 'name',
      header: (
        <button 
          onClick={() => handleSort('name')} 
          className="flex items-center gap-1 hover:text-foreground"
        >
          Supplier
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: (item) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.contact_person && (
            <p className="text-xs text-muted-foreground">{item.contact_person}</p>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (item) => (
        <div className="space-y-1">
          {item.email && (
            <div className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span>{item.email}</span>
            </div>
          )}
          {item.phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{item.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      cell: (item) => (
        <span className="text-sm text-muted-foreground line-clamp-2">
          {item.address || '-'}
        </span>
      ),
    },
    {
      key: 'terms',
      header: 'Payment Terms',
      cell: (item) => (
        <div>
          <span className="text-sm">{item.payment_terms || '-'}</span>
          {item.payment_terms === 'Other' && item.payment_terms_notes && (
            <p className="text-xs text-muted-foreground">{item.payment_terms_notes}</p>
          )}
        </div>
      ),
    },
    {
      key: 'materials',
      header: 'Materials',
      cell: (item) => (
        <span className="text-sm">{item.materials_count}</span>
      ),
    },
    {
      key: 'total_quantity',
      header: (
        <button 
          onClick={() => handleSort('total_quantity')} 
          className="flex items-center gap-1 hover:text-foreground"
        >
          Total Qty
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: (item) => (
        <span className="text-sm font-medium">{formatNumber(item.total_quantity)}</span>
      ),
    },
    {
      key: 'total_spent',
      header: (
        <button 
          onClick={() => handleSort('total_spent')} 
          className="flex items-center gap-1 hover:text-foreground"
        >
          Total Spent
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      cell: (item) => (
        <span className="text-sm font-medium">{formatCurrency(item.total_spent)}</span>
      ),
    },
    {
      key: 'avg_price',
      header: 'Avg Unit Price',
      cell: (item) => (
        <span className="text-sm text-muted-foreground">{formatCurrency(item.avg_unit_price)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteSupplier.mutate(item.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  if (!isLoading && suppliers.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Suppliers" description="Manage your supplier relationships." />
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <EmptyState
            icon={Truck}
            title="No suppliers yet"
            description="Add your first supplier to manage vendor relationships and purchasing."
            action={{
              label: 'Add Supplier',
              onClick: () => setIsOpen(true),
            }}
          />
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add Supplier</DialogTitle>
                <DialogDescription>
                  Add a new supplier to your network.
                </DialogDescription>
              </DialogHeader>
              <SupplierForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Add Supplier'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier relationships."
        actions={
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
                  <DialogDescription>
                    {editingSupplier ? 'Update supplier details.' : 'Add a new supplier to your network.'}
                  </DialogDescription>
                </DialogHeader>
                <SupplierForm formData={formData} setFormData={setFormData} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingSupplier ? 'Updating...' : 'Creating...') : (editingSupplier ? 'Update Supplier' : 'Add Supplier')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredAndSortedSuppliers}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No suppliers found matching your search."
      />
    </div>
  );
}

function SupplierForm({
  formData,
  setFormData,
}: {
  formData: typeof initialFormData;
  setFormData: (data: typeof initialFormData) => void;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Acme Supplies Inc."
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact">Contact Person *</Label>
          <Input
            id="contact"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            placeholder="John Smith"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@supplier.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Industrial Ave, City, State, ZIP"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="terms">Payment Terms *</Label>
          <Select
            value={formData.payment_terms}
            onValueChange={(value) => setFormData({ ...formData, payment_terms: value, payment_terms_notes: value !== 'Other' ? '' : formData.payment_terms_notes })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment terms" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS_OPTIONS.map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {formData.payment_terms === 'Other' && (
          <div className="space-y-2">
            <Label htmlFor="terms_notes">Payment Terms Notes</Label>
            <Input
              id="terms_notes"
              value={formData.payment_terms_notes}
              onChange={(e) => setFormData({ ...formData, payment_terms_notes: e.target.value })}
              placeholder="Describe payment terms..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
