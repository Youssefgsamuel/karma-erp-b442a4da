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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, MoreHorizontal, Trash2, Send, X, Check, Mail, MessageCircle, Filter, History, Edit, PackageCheck } from 'lucide-react';
import { QuotationAvailabilityInfo } from '@/components/quotations/QuotationAvailabilityInfo';
import { useQuotations, useCreateQuotation, useUpdateQuotationStatus, useDeleteQuotation, Quotation, CreateQuotationInput } from '@/hooks/useQuotations';
import { useProducts } from '@/hooks/useProducts';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useCategories } from '@/hooks/useCategories';
import { useRawMaterialCategories } from '@/hooks/useRawMaterialCategories';
import { QuotationEditHistoryDialog } from '@/components/quotations/QuotationEditHistoryDialog';
import { QuotationDetailsDialog } from '@/components/quotations/QuotationDetailsDialog';
import { QuotationEditDialog } from '@/components/quotations/QuotationEditDialog';
import { format } from 'date-fns';
import { formatNumber, formatCurrency } from '@/lib/utils';

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
  const { data: rawMaterials = [] } = useRawMaterials();
  const { data: categories = [] } = useCategories();
  const { data: rawMaterialCategories = [] } = useRawMaterialCategories();
  const createQuotation = useCreateQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const deleteQuotation = useDeleteQuotation();

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

  // Category filters
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [selectedRawMaterialCategory, setSelectedRawMaterialCategory] = useState<string>('all');
  const [itemType, setItemType] = useState<'product' | 'material'>('product');
  const [historyDialog, setHistoryDialog] = useState<{ id: string; number: string } | null>(null);
  const [detailsDialog, setDetailsDialog] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<string | null>(null);

  // Filtered products and raw materials
  const filteredProducts = useMemo(() => {
    if (selectedProductCategory === 'all') return products;
    return products.filter(p => p.category_id === selectedProductCategory);
  }, [products, selectedProductCategory]);

  const saleableRawMaterials = useMemo(() => {
    return rawMaterials.filter(m => m.is_for_sale);
  }, [rawMaterials]);

  const filteredRawMaterials = useMemo(() => {
    if (selectedRawMaterialCategory === 'all') return saleableRawMaterials;
    return saleableRawMaterials.filter(m => m.category_id === selectedRawMaterialCategory);
  }, [saleableRawMaterials, selectedRawMaterialCategory]);

  // Check inventory availability for items
  const inventoryAvailability = useMemo(() => {
    const productItems = formData.items.filter(item => item.product_id);
    if (productItems.length === 0) return { allInStock: false, partialInStock: false, items: [] };
    
    const itemsWithAvailability = productItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      const inStock = product ? Number(product.current_stock) >= item.quantity : false;
      return { ...item, product, inStock, available: product?.current_stock || 0 };
    });
    
    const allInStock = itemsWithAvailability.every(item => item.inStock);
    const partialInStock = itemsWithAvailability.some(item => item.inStock);
    
    return { allInStock, partialInStock, items: itemsWithAvailability };
  }, [formData.items, products]);

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

  const handleRawMaterialSelect = (index: number, materialId: string) => {
    const material = saleableRawMaterials.find(m => m.id === materialId);
    if (material) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { 
            ...item, 
            product_id: undefined, // Clear product_id for raw material items
            description: `${material.name} (Raw Material)`,
            unit_price: material.cost_per_unit 
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
    return `Quotation ${q.quotation_number}\n\nDear ${q.customer_name},\n\nPlease find your quotation details:\n\nTotal: ${formatCurrency(q.total)}\nValid Until: ${new Date(q.valid_until).toLocaleDateString()}\n\nThank you for your business!`;
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

  const columns: Column<Quotation>[] = [
    { key: 'quotation_number', header: 'Number', cell: (q) => (
      <button 
        className="font-medium text-primary hover:underline cursor-pointer"
        onClick={() => setDetailsDialog(q.id)}
      >
        {q.quotation_number}
      </button>
    )},
    { key: 'customer_name', header: 'Customer', cell: (q) => q.customer_name },
    { key: 'status', header: 'Status', cell: (q) => (
      <Badge className={statusColors[q.status]}>{q.status}</Badge>
    )},
    { key: 'edited', header: 'Edited', cell: (q) => {
      const editCount = (q as Quotation & { edit_count?: number }).edit_count || 0;
      return editCount > 0 ? (
        <button
          className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
          onClick={() => setHistoryDialog({ id: q.id, number: q.quotation_number })}
        >
          <History className="h-3 w-3" />
          {editCount}x
        </button>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    }},
    { key: 'valid_until', header: 'Valid Until', cell: (q) => format(new Date(q.valid_until), 'MMM d, yyyy') },
    { key: 'total', header: 'Total', cell: (q) => formatCurrency(q.total) },
    { key: 'actions', header: '', cell: (q) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(q.status === 'draft' || q.status === 'sent') && (
            <DropdownMenuItem onClick={() => setEditDialog(q.id)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Quotation
            </DropdownMenuItem>
          )}
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
                <Check className="mr-2 h-4 w-4" /> Accept & Create MO (All Items)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: 'accepted', partialFulfillment: true })}>
                <PackageCheck className="mr-2 h-4 w-4" /> Accept (Partial: Inventory + MO)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: 'accepted', createMO: false })}>
                <PackageCheck className="mr-2 h-4 w-4" /> Accept (From Inventory Only)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: 'rejected' })}>
                <X className="mr-2 h-4 w-4" /> Mark Rejected
              </DropdownMenuItem>
            </>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              
              {/* Item Type Tabs */}
              <Tabs value={itemType} onValueChange={(v) => setItemType(v as 'product' | 'material')} className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <TabsList>
                    <TabsTrigger value="product">Products</TabsTrigger>
                    <TabsTrigger value="material">Raw Materials</TabsTrigger>
                  </TabsList>
                  
                  {/* Category Filters */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    {itemType === 'product' && (
                      <Select value={selectedProductCategory} onValueChange={setSelectedProductCategory}>
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {itemType === 'material' && (
                      <Select value={selectedRawMaterialCategory} onValueChange={setSelectedRawMaterialCategory}>
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {rawMaterialCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <TabsContent value="product" className="m-0 flex-shrink-0">
                        <Select onValueChange={(v) => handleProductSelect(index, v)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} {p.category?.name ? `(${p.category.name})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TabsContent>
                      <TabsContent value="material" className="m-0 flex-shrink-0">
                        <Select onValueChange={(v) => handleRawMaterialSelect(index, v)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredRawMaterials.length === 0 ? (
                              <SelectItem value="_none" disabled>No materials for sale</SelectItem>
                            ) : (
                              filteredRawMaterials.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </TabsContent>
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
              </Tabs>
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

            {/* Inventory Availability Info */}
            <QuotationAvailabilityInfo
              items={formData.items}
              products={products.map(p => ({
                id: p.id,
                name: p.name,
                current_stock: Number(p.current_stock),
                assigned_quantity: Number(p.assigned_quantity),
              }))}
            />

            <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount:</span> <span>-{formatCurrency(discountAmount)}</span></div>
              <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total:</span> <span>{formatCurrency(total)}</span></div>
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

      {/* Edit History Dialog */}
      {historyDialog && (
        <QuotationEditHistoryDialog
          open={!!historyDialog}
          onOpenChange={() => setHistoryDialog(null)}
          quotationId={historyDialog.id}
          quotationNumber={historyDialog.number}
        />
      )}

      {/* Details Dialog */}
      {detailsDialog && (
        <QuotationDetailsDialog
          open={!!detailsDialog}
          onOpenChange={() => setDetailsDialog(null)}
          quotationId={detailsDialog}
        />
      )}

      {/* Edit Dialog */}
      {editDialog && (
        <QuotationEditDialog
          open={!!editDialog}
          onOpenChange={() => setEditDialog(null)}
          quotationId={editDialog}
        />
      )}
    </div>
  );
}