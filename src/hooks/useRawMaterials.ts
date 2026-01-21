import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RawMaterial, UnitOfMeasure, Supplier } from '@/types/erp';
import { useToast } from '@/hooks/use-toast';

export function useRawMaterials() {
  return useQuery({
    queryKey: ['raw-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('name');
      
      if (error) throw error;
      return data as (RawMaterial & { supplier: Supplier | null })[];
    },
  });
}

export function useRawMaterial(id: string) {
  return useQuery({
    queryKey: ['raw-materials', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as RawMaterial & { supplier: Supplier | null };
    },
    enabled: !!id,
  });
}

interface CreateRawMaterialInput {
  sku: string;
  name: string;
  description?: string;
  unit: UnitOfMeasure;
  cost_per_unit: number;
  minimum_stock: number;
  current_stock: number;
  reorder_point: number;
  supplier_id?: string;
}

export function useCreateRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateRawMaterialInput) => {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Raw Material Created',
        description: 'The raw material has been created successfully.',
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

export function useUpdateRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateRawMaterialInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('raw_materials')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Raw Material Updated',
        description: 'The raw material has been updated successfully.',
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

export function useDeleteRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Raw Material Deleted',
        description: 'The raw material has been deleted successfully.',
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

export function useLowStockMaterials() {
  return useQuery({
    queryKey: ['low-stock-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .filter('current_stock', 'lte', 'minimum_stock');
      
      if (error) throw error;
      return data as RawMaterial[];
    },
  });
}
