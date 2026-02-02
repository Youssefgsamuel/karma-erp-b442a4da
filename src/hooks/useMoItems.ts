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
      const { data, error } = await supabase
        .from('mo_items')
        .update({ status })
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;

      // Check if all items are completed
      if (status === 'completed') {
        const { data: allItems } = await supabase
          .from('mo_items')
          .select('status')
          .eq('mo_id', moId);

        const allCompleted = allItems?.every(item => item.status === 'completed');
        
        // If all items are completed, we can notify or trigger MO completion
        if (allCompleted && allItems && allItems.length > 0) {
          toast.info('All items completed! You can now mark the MO as complete.');
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mo-items', variables.moId] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
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