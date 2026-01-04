import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManufacturingOrder {
  id: string;
  mo_number: string;
  product_id: string;
  quantity: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sales_order_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  product?: { name: string; sku: string } | null;
}

export interface CreateMOInput {
  product_id: string;
  quantity: number;
  priority?: ManufacturingOrder['priority'];
  planned_start?: string;
  planned_end?: string;
  sales_order_id?: string;
  notes?: string;
}

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

export function useManufacturingOrders() {
  return useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manufacturing_orders')
        .select('*, product:products(name, sku)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ManufacturingOrder[];
    },
  });
}

export function useManufacturingOrder(id: string) {
  return useQuery({
    queryKey: ['manufacturing_orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manufacturing_orders')
        .select('*, product:products(name, sku)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ManufacturingOrder | null;
    },
    enabled: !!id,
  });
}

export function useCreateManufacturingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMOInput) => {
      const mo_number = await generateMONumber();

      const { data, error } = await supabase
        .from('manufacturing_orders')
        .insert({
          mo_number,
          product_id: input.product_id,
          quantity: input.quantity,
          priority: input.priority || 'normal',
          planned_start: input.planned_start,
          planned_end: input.planned_end,
          sales_order_id: input.sales_order_id,
          notes: input.notes,
        })
        .select('*, product:products(name, sku)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      toast.success('Manufacturing Order created');
    },
    onError: (error) => {
      toast.error(`Failed to create MO: ${error.message}`);
    },
  });
}

export function useUpdateManufacturingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ManufacturingOrder> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Handle status transitions
      if (updates.status === 'in_progress' && !updates.actual_start) {
        updateData.actual_start = new Date().toISOString();
      }
      if (updates.status === 'completed' && !updates.actual_end) {
        updateData.actual_end = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('manufacturing_orders')
        .update(updateData)
        .eq('id', id)
        .select('*, product:products(name, sku)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      toast.success('Manufacturing Order updated');
    },
    onError: (error) => {
      toast.error(`Failed to update MO: ${error.message}`);
    },
  });
}

export function useDeleteManufacturingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('manufacturing_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      toast.success('Manufacturing Order deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete MO: ${error.message}`);
    },
  });
}
