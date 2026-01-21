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

      // If status is accepted and createMO is true, create manufacturing orders for products
      if (status === 'accepted' && createMO) {
        const { data: quotationItems } = await supabase
          .from('quotation_items')
          .select('*, product:products(id, name)')
          .eq('quotation_id', id);

        if (quotationItems && quotationItems.length > 0) {
          for (const item of quotationItems) {
            if (item.product_id) {
              const mo_number = await generateMONumber();
              await supabase
                .from('manufacturing_orders')
                .insert({
                  mo_number,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  priority: 'normal',
                  notes: `Auto-created from quotation ${data.quotation_number}`,
                });
            }
          }
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (variables.status === 'accepted' && variables.createMO) {
        queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
        toast.success('Quotation accepted and Manufacturing Orders created');
      } else {
        toast.success('Quotation status updated');
      }
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
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

export function useConvertToSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotationId: string) => {
      // Get quotation
      const { data: quotation, error: qError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (qError) throw qError;

      const order_number = await generateOrderNumber();

      // Create sales order
      const { data: salesOrder, error: soError } = await supabase
        .from('sales_orders')
        .insert({
          order_number,
          quotation_id: quotationId,
          customer_id: quotation.customer_id,
          customer_name: quotation.customer_name,
          subtotal: quotation.subtotal,
          discount_percent: quotation.discount_percent,
          tax_percent: quotation.tax_percent,
          total: quotation.total,
          notes: quotation.notes,
        })
        .select()
        .single();

      if (soError) throw soError;

      // Update quotation status
      await supabase
        .from('quotations')
        .update({ status: 'converted' })
        .eq('id', quotationId);

      return salesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Quotation converted to Sales Order');
    },
    onError: (error) => {
      toast.error(`Failed to convert: ${error.message}`);
    },
  });
}
