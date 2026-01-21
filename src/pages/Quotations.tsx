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
import { Plus, MoreHorizontal, FileCheck, Trash2, Send, X, Check, ArrowRightLeft, Mail, MessageCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuotations, useCreateQuotation, useUpdateQuotationStatus, useDeleteQuotation, useConvertToSalesOrder, Quotation, CreateQuotationInput } from '@/hooks/useQuotations';
import { useProducts } from '@/hooks/useProducts';
import { useBomAvailability } from '@/hooks/useBomAvailability';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const statusColors: Record<Quotation['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  expired: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function Quotations() {
  const { data: quotations = [], isLoading } = useQuotations();
  const { data: products = [] } = useProducts();
  const createQuotation = useCreateQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const deleteQuotation = useDeleteQuotation();
  const convertToSalesOrder = useConvertToSalesOrder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateQuotationInput>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discount_percent: 0,
    tax_percent: 0,
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
  });

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0 }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { 
            ...item, 
            product_id: productId,
            description: product.name,
            unit_price: product.selling_price 
          } : item
        ),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createQuotation.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      discount_percent: 0,
      tax_percent: 0,
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    });
  };

  const generateQuotationMessage = (q: Quotation) => {
    return `Quotation ${q.quotation_number}\n\nDear ${q.customer_name},\n\nPlease find your quotation details:\n\nTotal: $${Number(q.total).toFixed(2)}\nValid Until: ${new Date(q.valid_until).toLocaleDateString()}\n\nThank you for your business!`;
  };

  const handleSendWhatsApp = (q: Quotation) => {
    if (!q.customer_phone) return;
    const phone = q.customer_phone.replace(/\D/g, '');
    const message = encodeURIComponent(generateQuotationMessage(q));
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    updateStatus.mutate({ id: q.id, status: 'sent' });
  };

  const handleSendEmail = (q: Quotation) => {
    if (!q.customer_email) return;
    const subject = encodeURIComponent(`Quotation ${q.quotation_number}`);
    const body = encodeURIComponent(generateQuotationMessage(q));
    window.open(`mailto:${q.customer_email}?subject=${subject}&body=${body}`, '_blank');
    updateStatus.mutate({ id: q.id, status: 'sent' });
  };

  const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = subtotal * (formData.discount_percent || 0) / 100;
  const taxAmount = (subtotal - discountAmount) * (formData.tax_percent || 0) / 100;
  const total = subtotal - discountAmount + taxAmount;

  // Check BOM availability for all items with products
  const productItemsForBomCheck = formData.items.filter(item => item.product_id);
  
  // Use a combined BOM check query
  const { data: bomAvailabilities = [] } = useQuery({
    queryKey: ['quotation-bom-check', productItemsForBomCheck.map(i => `${i.product_id}-${i.quantity}`)],
    queryFn: async () => {
      const results = await Promise.all(
        productItemsForBomCheck.map(async (item) => {
          // Get BOM items for this product
          const { data: bomItems } = await supabase
            .from('bom_items')
            .select(`*, raw_material:raw_materials(id, name, current_stock, unit)`)
            .eq('product_id', item.product_id!);
          
          if (!bomItems || bomItems.length === 0) {
            return { product_id: item.product_id, has_bom: false, shortages: [] };
          }
          
          const shortages = bomItems
            .map((bom: any) => {
              const required = Number(bom.quantity) * item.quantity;
              const available = Number(bom.raw_material?.current_stock || 0);
              return {
                name: bom.raw_material?.name,
                required,
                available,
                shortage: Math.max(0, required - available)
              };
            })
            .filter((s: any) => s.shortage > 0);
          
          return { product_id: item.product_id, has_bom: true, shortages };
        })
      );
      return results;
    },
    enabled: productItemsForBomCheck.length > 0,
  });

  const hasShortages = bomAvailabilities.some((b: any) => b.shortages?.length > 0);

  const columns: Column<Quotation>[] = [
    { key: 'quotation_number', header: 'Number', cell: (q) => <span className="font-medium">{q.quotation_number}</span> },
    { key: 'customer_name', header: 'Customer', cell: (q) => q.customer_name },
    { key: 'status', header: 'Status', cell: (q) => (
      <Badge className={statusColors[q.status]}>{q.status}</Badge>
    )},
    { key: 'valid_until', header: 'Valid Until', cell: (q) => format(new Date(q.valid_until), 'MMM d, yyyy') },
    { key: 'total', header: 'Total', cell: (q) => `$${Number(q.total).toFixed(2)}` },
    { key: 'actions', header: '', cell: (q) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {q.status === 'draft' && (
            <>
              {q.customer_phone && (
                <DropdownMenuItem onClick={() => handleSendWhatsApp(q)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Send via WhatsApp
                </DropdownMenuItem>
              )}
              {q.customer_email && (
                <DropdownMenuItem onClick={() => handleSendEmail(q)}>
                  <Mail className="mr-2 h-4 w-4" /> Send via Email
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: 'sent' })}>
                <Send className="mr-2 h-4 w-4" /> Mark as Sent
              </DropdownMenuItem>
            </>
          )}
          {q.status === 'sent' && (
            <>
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: 'accepted', createMO: true })}>
                <Check className="mr-2 h-4 w-4" /> Mark Accepted & Create MO
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: 'rejected' })}>
                <X className="mr-2 h-4 w-4" /> Mark Rejected
              </DropdownMenuItem>
            </>
          )}
          {q.status === 'accepted' && (
            <DropdownMenuItem onClick={() => convertToSalesOrder.mutate(q.id)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Convert to Sales Order
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => deleteQuotation.mutate(q.id)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quotations"
        description="Create and manage customer quotations."
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Quotation
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={quotations}
        keyExtractor={(q) => q.id}
        isLoading={isLoading}
        emptyMessage="No quotations yet. Create your first quotation."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Quotation</DialogTitle>
            <DialogDescription>Create a new quotation for a customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Customer Phone</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Select onValueChange={(v) => handleProductSelect(index, v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                      className="w-24"
                    />
                    {formData.items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount %</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax %</Label>
                <Input
                  id="tax"
                  type="number"
                  value={formData.tax_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax_percent: Number(e.target.value) }))}
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
            {hasShortages && (
              <div className="rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-700 dark:text-yellow-400">Material Shortages Detected</span>
                </div>
                <div className="text-sm space-y-1">
                  {bomAvailabilities.filter((b: any) => b.shortages?.length > 0).map((b: any) => (
                    <div key={b.product_id}>
                      {b.shortages.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-yellow-700 dark:text-yellow-400">
                          <span>{s.name}</span>
                          <span>Need {s.shortage} more (have {s.available}/{s.required})</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productItemsForBomCheck.length > 0 && !hasShortages && bomAvailabilities.length > 0 && (
              <div className="rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">All Materials Available</span>
                </div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span> <span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount:</span> <span>-${discountAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax:</span> <span>${taxAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total:</span> <span>${total.toFixed(2)}</span></div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createQuotation.isPending}>
                {createQuotation.isPending ? 'Creating...' : 'Create Quotation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
