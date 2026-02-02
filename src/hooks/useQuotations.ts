import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper to generate MO number
async function generateMONumber() {
  const { data } = await supabase
    .from('manufacturing_orders')
    .select('mo_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const lastNum = data?.[0]?.mo_number;
  const nextNum = lastNum ? parseInt(lastNum.replace('MO-', '')) + 1 : 1;
  return `MO-${String(nextNum).padStart(5, '0')}`;
}

// Helper to create product assignments for quotation items
async function createProductAssignments(quotationId: string, items: Array<{ product_id: string | null; quantity: number }>) {
  const productItems = items.filter(item => item.product_id);
  if (productItems.length === 0) return;

  const assignments = productItems.map(item => ({
    product_id: item.product_id!,
    quotation_id: quotationId,
    quantity: item.quantity,
    status: 'pending' as const,
  }));

  await supabase.from('product_assignments').insert(assignments);

  // Update assigned_quantity for each product
  for (const item of productItems) {
    const { data: currentAssignments } = await supabase
      .from('product_assignments')
      .select('quantity')
      .eq('product_id', item.product_id!)
      .in('status', ['pending', 'in_production']);

    const totalAssigned = currentAssignments?.reduce((sum, a) => sum + Number(a.quantity), 0) || 0;

    await supabase
      .from('products')
      .update({ assigned_quantity: totalAssigned })
      .eq('id', item.product_id!);
  }
}
export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  valid_from: string;
  valid_until: string;
  subtotal: number;
  discount_percent: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  product?: { name: string; sku: string } | null;
}

export interface CreateQuotationInput {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string;
  valid_from: string;
  valid_until: string;
  discount_percent?: number;
  tax_percent?: number;
  notes?: string;
  items: {
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
  }[];
}

async function generateQuotationNumber() {
  const { data } = await supabase
    .from('quotations')
    .select('quotation_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const lastNum = data?.[0]?.quotation_number;
  const nextNum = lastNum ? parseInt(lastNum.replace('QT-', '')) + 1 : 1;
  return `QT-${String(nextNum).padStart(5, '0')}`;
}

export function useQuotations() {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Quotation[];
    },
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['quotations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Quotation | null;
    },
    enabled: !!id,
  });
}

export function useQuotationItems(quotationId: string) {
  return useQuery({
    queryKey: ['quotation_items', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_items')
        .select('*, product:products(name, sku)')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as QuotationItem[];
    },
    enabled: !!quotationId,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuotationInput) => {
      const quotation_number = await generateQuotationNumber();
      
      const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const discountAmount = subtotal * (input.discount_percent || 0) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (input.tax_percent || 0) / 100;
      const total = taxableAmount + taxAmount;

      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          quotation_number,
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone,
          customer_id: input.customer_id,
          valid_from: input.valid_from,
          valid_until: input.valid_until,
          discount_percent: input.discount_percent || 0,
          tax_percent: input.tax_percent || 0,
          subtotal,
          total,
          notes: input.notes,
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      const itemsToInsert = input.items.map(item => ({
        quotation_id: quotation.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return quotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create quotation: ${error.message}`);
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      customer_name: string;
      customer_email?: string;
      customer_phone?: string;
      valid_from: string;
      valid_until: string;
      discount_percent?: number;
      tax_percent?: number;
      notes?: string;
      items: {
        id?: string;
        product_id?: string;
        description: string;
        quantity: number;
        unit_price: number;
      }[];
    }) => {
      // Get current quotation for edit history
      const { data: currentQuotation } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', input.id)
        .single();

      const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const discountAmount = subtotal * (input.discount_percent || 0) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (input.tax_percent || 0) / 100;
      const total = taxableAmount + taxAmount;

      // Track changes
      const changes: Record<string, any> = {};
      const previousValues: Record<string, any> = {};

      if (currentQuotation) {
        if (currentQuotation.customer_name !== input.customer_name) {
          changes.customer_name = input.customer_name;
          previousValues.customer_name = currentQuotation.customer_name;
        }
        if (currentQuotation.discount_percent !== input.discount_percent) {
          changes.discount_percent = input.discount_percent;
          previousValues.discount_percent = currentQuotation.discount_percent;
        }
        if (currentQuotation.tax_percent !== input.tax_percent) {
          changes.tax_percent = input.tax_percent;
          previousValues.tax_percent = currentQuotation.tax_percent;
        }
        if (currentQuotation.total !== total) {
          changes.total = total;
          previousValues.total = currentQuotation.total;
        }
      }

      // Update quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .update({
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone,
          valid_from: input.valid_from,
          valid_until: input.valid_until,
          discount_percent: input.discount_percent || 0,
          tax_percent: input.tax_percent || 0,
          subtotal,
          total,
          notes: input.notes,
          edit_count: (currentQuotation?.edit_count || 0) + 1,
        })
        .eq('id', input.id)
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Record edit history
      if (Object.keys(changes).length > 0) {
        await supabase.from('quotation_edit_history').insert({
          quotation_id: input.id,
          changes,
          previous_values: previousValues,
        });
      }

      // Delete existing items and insert new ones
      await supabase.from('quotation_items').delete().eq('quotation_id', input.id);

      const itemsToInsert = input.items.map(item => ({
        quotation_id: input.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      await supabase.from('quotation_items').insert(itemsToInsert);

      return quotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation_items'] });
      toast.success('Quotation updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update quotation: ${error.message}`);
    },
  });
}

export function useUpdateQuotationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, createMO = false }: { id: string; status: Quotation['status']; createMO?: boolean }) => {
      const { data, error } = await supabase
        .from('quotations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If status is accepted, always create sales order and optionally create MO
      if (status === 'accepted') {
        // Create sales order automatically
        const order_number = await generateOrderNumber();

        const { data: salesOrder, error: soError } = await supabase
          .from('sales_orders')
          .insert({
            order_number,
            quotation_id: id,
            customer_id: data.customer_id,
            customer_name: data.customer_name,
            subtotal: data.subtotal,
            discount_percent: data.discount_percent,
            tax_percent: data.tax_percent,
            total: data.total,
            notes: data.notes,
          })
          .select()
          .single();

        if (soError) throw soError;

        // Get quotation items
        const { data: quotationItems } = await supabase
          .from('quotation_items')
          .select('*, product:products(id, name, current_stock)')
          .eq('quotation_id', id);

        if (quotationItems && quotationItems.length > 0) {
          const productItems = quotationItems.filter(item => item.product_id);
          
          // Check if all products have sufficient inventory
          const allInStock = productItems.every(item => {
            const product = item.product as { current_stock: number } | null;
            return product && Number(product.current_stock) >= Number(item.quantity);
          });

          if (allInStock && productItems.length > 0) {
            // Don't create MO - items can be fulfilled from inventory
            // Update sales order to ready status
            await supabase
              .from('sales_orders')
              .update({ status: 'confirmed' })
              .eq('id', salesOrder.id);
          } else if (createMO && productItems.length > 0) {
            // Create MO for items not in stock
            const mo_number = await generateMONumber();
            const firstItem = productItems[0];
            
            const { data: moData, error: moError } = await supabase
              .from('manufacturing_orders')
              .insert({
                mo_number,
                product_id: firstItem.product_id,
                quantity: firstItem.quantity,
                priority: 'normal',
                quotation_id: id,
                sales_order_id: salesOrder.id,
                notes: `Auto-created from quotation ${data.quotation_number}`,
              })
              .select()
              .single();

            if (moError) throw moError;

            if (productItems.length > 1) {
              const additionalItems = productItems.slice(1).map(item => ({
                mo_id: moData.id,
                product_id: item.product_id,
                quantity: item.quantity,
                status: 'pending' as const,
                notes: `From quotation ${data.quotation_number}`,
              }));

              await supabase.from('mo_items').insert(additionalItems);
            }

            // Create product assignments
            await createProductAssignments(id, productItems.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
            })));

            // Update assignments with MO id
            await supabase
              .from('product_assignments')
              .update({ status: 'in_production', mo_id: moData.id })
              .eq('quotation_id', id);
          }
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['product-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (variables.status === 'accepted') {
        queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
        queryClient.invalidateQueries({ queryKey: ['mo-items'] });
        toast.success('Quotation accepted and Sales Order created');
      } else {
        toast.success('Quotation status updated');
      }
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

async function generateOrderNumber() {
  const { data } = await supabase
    .from('sales_orders')
    .select('order_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const lastNum = data?.[0]?.order_number;
  const nextNum = lastNum ? parseInt(lastNum.replace('SO-', '')) + 1 : 1;
  return `SO-${String(nextNum).padStart(5, '0')}`;
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if quotation is linked to sales orders
      const { data: salesOrders } = await supabase
        .from('sales_orders')
        .select('id, order_number')
        .eq('quotation_id', id)
        .limit(1);
      
      if (salesOrders && salesOrders.length > 0) {
        throw new Error(`Cannot delete: This quotation has been converted to Sales Order ${salesOrders[0].order_number}. Delete the sales order first.`);
      }

      // Delete quotation items first
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id);

      if (itemsError) throw itemsError;

      // Then delete the quotation
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete quotation: ${error.message}`);
    },
  });
}

// Convert to sales order function removed - sales order is now created automatically when quotation is accepted
