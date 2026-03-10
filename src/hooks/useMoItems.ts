import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MoItem, Product } from '@/types/erp';

export interface MoItemWithProduct extends MoItem {
  product?: Product | null;
}

export function useMoItems(moId: string) {
  return useQuery({
    queryKey: ['mo-items', moId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mo_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('mo_id', moId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as MoItemWithProduct[];
    },
    enabled: !!moId,
  });
}

export function useAllMoItems(moIds: string[]) {
  return useQuery({
    queryKey: ['all-mo-items', moIds],
    queryFn: async () => {
      if (moIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('mo_items')
        .select(`
          *,
          product:products(*)
        `)
        .in('mo_id', moIds)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as MoItemWithProduct[];
    },
    enabled: moIds.length > 0,
  });
}

export interface CreateMoItemInput {
  mo_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
}

export function useCreateMoItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: CreateMoItemInput[]) => {
      const { data, error } = await supabase
        .from('mo_items')
        .insert(items)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['mo-items', variables[0].mo_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (error) => {
      toast.error(`Failed to add items: ${error.message}`);
    },
  });
}

export function useUpdateMoItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, status, moId }: { itemId: string; status: 'pending' | 'in_progress' | 'completed'; moId: string }) => {
      // Get item details before updating
      const { data: item, error: itemError } = await supabase
        .from('mo_items')
        .select('*, product:products(name, sku)')
        .eq('id', itemId)
        .single();
      if (itemError) throw itemError;

      const { data, error } = await supabase
        .from('mo_items')
        .update({ status })
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;

      // When an item is marked completed, create a QC record for it immediately
      if (status === 'completed' && item) {
        await supabase.from('quality_control_records').insert({
          mo_id: moId,
          product_id: item.product_id,
          quantity: item.quantity,
          status: 'under_review',
        });
      }

      // Check if ALL items (mo_items) are completed
      if (status === 'completed') {
        const { data: allItems } = await supabase
          .from('mo_items')
          .select('status')
          .eq('mo_id', moId);

        const allCompleted = allItems?.every(i => i.status === 'completed');
        
        if (allCompleted && allItems && allItems.length > 0) {
          // Get MO details to also create QC for primary product
          const { data: mo } = await supabase
            .from('manufacturing_orders')
            .select('product_id, quantity, status')
            .eq('id', moId)
            .single();

          if (mo && mo.status === 'in_progress') {
            // Create QC record for primary product
            await supabase.from('quality_control_records').insert({
              mo_id: moId,
              product_id: mo.product_id,
              quantity: mo.quantity,
              status: 'under_review',
            });

            // Move MO to under_qc
            await supabase
              .from('manufacturing_orders')
              .update({ status: 'under_qc', actual_end: new Date().toISOString() })
              .eq('id', moId);
          }

          toast.info('All items completed! MO sent to Quality Control.');
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mo-items', variables.moId] });
      queryClient.invalidateQueries({ queryKey: ['all-mo-items'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-records'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-counts'] });
      toast.success('Item status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

export function useDeleteMoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, moId }: { itemId: string; moId: string }) => {
      const { error } = await supabase
        .from('mo_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      return moId;
    },
    onSuccess: (moId) => {
      queryClient.invalidateQueries({ queryKey: ['mo-items', moId] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      toast.success('Item removed');
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });
}