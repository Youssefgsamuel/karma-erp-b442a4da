import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BomItem, RawMaterial, Product } from '@/types/erp';
import { useToast } from '@/hooks/use-toast';

export interface BomItemWithDetails extends BomItem {
  raw_material: RawMaterial;
  product: Product;
}

export function useBomItems() {
  return useQuery({
    queryKey: ['bom-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bom_items')
        .select(`
          *,
          raw_material:raw_materials(*),
          product:products(*)
        `)
        .order('created_at');
      
      if (error) throw error;
      return data as BomItemWithDetails[];
    },
  });
}

export function useBomItemsByProduct(productId: string) {
  return useQuery({
    queryKey: ['bom-items', 'product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bom_items')
        .select(`
          *,
          raw_material:raw_materials(*)
        `)
        .eq('product_id', productId)
        .order('created_at');
      
      if (error) throw error;
      return data as (BomItem & { raw_material: RawMaterial })[];
    },
    enabled: !!productId,
  });
}

interface CreateBomItemInput {
  product_id: string;
  raw_material_id: string;
  quantity: number;
  notes?: string;
}

export function useCreateBomItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateBomItemInput) => {
      const { data, error } = await supabase
        .from('bom_items')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items'] });
      toast({
        title: 'BOM Item Added',
        description: 'The material has been added to the bill of materials.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useUpdateBomItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateBomItemInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('bom_items')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items'] });
      toast({
        title: 'BOM Item Updated',
        description: 'The material quantity has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useDeleteBomItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bom_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items'] });
      toast({
        title: 'BOM Item Removed',
        description: 'The material has been removed from the bill of materials.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}
