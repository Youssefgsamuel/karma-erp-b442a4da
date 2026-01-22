import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Supplier, SupplierWithStats } from '@/types/erp';
import { useToast } from '@/hooks/use-toast';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export function useSuppliersWithStats() {
  return useQuery({
    queryKey: ['suppliers-with-stats'],
    queryFn: async () => {
      // Get suppliers
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (suppliersError) throw suppliersError;

      // Get raw materials with supplier info
      const { data: materials, error: materialsError } = await supabase
        .from('raw_materials')
        .select('supplier_id, current_stock, cost_per_unit');
      
      if (materialsError) throw materialsError;

      // Calculate stats for each supplier
      const suppliersWithStats: SupplierWithStats[] = (suppliers || []).map((supplier) => {
        const supplierMaterials = (materials || []).filter((m) => m.supplier_id === supplier.id);
        
        const total_quantity = supplierMaterials.reduce((sum, m) => sum + Number(m.current_stock), 0);
        const total_spent = supplierMaterials.reduce((sum, m) => sum + (Number(m.current_stock) * Number(m.cost_per_unit)), 0);
        const materials_count = supplierMaterials.length;
        const avg_unit_price = materials_count > 0 
          ? supplierMaterials.reduce((sum, m) => sum + Number(m.cost_per_unit), 0) / materials_count 
          : 0;

        return {
          ...supplier,
          payment_terms_notes: supplier.payment_terms_notes || '',
          total_quantity,
          total_spent,
          avg_unit_price,
          materials_count,
        };
      });

      return suppliersWithStats;
    },
  });
}

interface CreateSupplierInput {
  name: string;
  contact_person: string;
  email?: string;
  phone: string;
  address: string;
  payment_terms: string;
  payment_terms_notes?: string;
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-with-stats'] });
      toast({
        title: 'Supplier Created',
        description: 'The supplier has been created successfully.',
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

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateSupplierInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-with-stats'] });
      toast({
        title: 'Supplier Updated',
        description: 'The supplier has been updated successfully.',
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

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-with-stats'] });
      toast({
        title: 'Supplier Deleted',
        description: 'The supplier has been deleted successfully.',
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
