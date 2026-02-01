import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Product } from '@/types/erp';
import type { ManufacturingOrder } from './useManufacturingOrders';

export interface SemiFinishedGood {
  id: string;
  product_id: string;
  mo_id: string | null;
  quantity: number;
  missing_items: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: Product | null;
  manufacturing_order?: ManufacturingOrder | null;
}

export function useSemiFinishedGoods() {
  return useQuery({
    queryKey: ['semi-finished-goods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_goods')
        .select(`
          *,
          product:products(*),
          manufacturing_order:manufacturing_orders(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SemiFinishedGood[];
    },
  });
}

export interface CreateSemiFinishedGoodInput {
  product_id: string;
  mo_id?: string;
  quantity: number;
  missing_items: string;
  notes?: string;
}

export function useCreateSemiFinishedGood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSemiFinishedGoodInput) => {
      const { data, error } = await supabase
        .from('semi_finished_goods')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semi-finished-goods'] });
      toast.success('Semi-finished good added');
    },
    onError: (error) => {
      toast.error(`Failed to add: ${error.message}`);
    },
  });
}

export function useUpdateSemiFinishedGood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SemiFinishedGood> & { id: string }) => {
      const { data, error } = await supabase
        .from('semi_finished_goods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semi-finished-goods'] });
      toast.success('Semi-finished good updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useDeleteSemiFinishedGood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('semi_finished_goods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semi-finished-goods'] });
      toast.success('Semi-finished good removed');
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
