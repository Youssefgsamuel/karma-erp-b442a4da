import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductAssignment {
  id: string;
  product_id: string;
  quotation_id: string | null;
  mo_id: string | null;
  quantity: number;
  status: 'pending' | 'in_production' | 'completed';
  created_at: string;
  updated_at: string;
  quotation?: { quotation_number: string } | null;
  manufacturing_order?: { mo_number: string } | null;
}

export function useProductAssignments(productId: string) {
  return useQuery({
    queryKey: ['product-assignments', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_assignments')
        .select(`
          *,
          quotation:quotations(quotation_number),
          manufacturing_order:manufacturing_orders(mo_number)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProductAssignment[];
    },
    enabled: !!productId,
  });
}

export function useCreateProductAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      quotation_id?: string;
      mo_id?: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase
        .from('product_assignments')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;

      // Update product assigned_quantity
      const { data: currentAssignments } = await supabase
        .from('product_assignments')
        .select('quantity')
        .eq('product_id', input.product_id)
        .in('status', ['pending', 'in_production']);

      const totalAssigned = currentAssignments?.reduce((sum, a) => sum + Number(a.quantity), 0) || 0;

      await supabase
        .from('products')
        .update({ assigned_quantity: totalAssigned })
        .eq('id', input.product_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-assignments', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProductAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, productId }: { id: string; status: 'pending' | 'in_production' | 'completed'; productId: string }) => {
      const { error } = await supabase
        .from('product_assignments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;

      // Recalculate assigned_quantity
      const { data: currentAssignments } = await supabase
        .from('product_assignments')
        .select('quantity')
        .eq('product_id', productId)
        .in('status', ['pending', 'in_production']);

      const totalAssigned = currentAssignments?.reduce((sum, a) => sum + Number(a.quantity), 0) || 0;

      await supabase
        .from('products')
        .update({ assigned_quantity: totalAssigned })
        .eq('id', productId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-assignments', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
