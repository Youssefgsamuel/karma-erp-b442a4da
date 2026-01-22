import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductMaterial, RawMaterial, MaterialSourceType } from '@/types/erp';
import { useToast } from '@/hooks/use-toast';

export interface ProductMaterialWithDetails extends ProductMaterial {
  raw_material: RawMaterial;
}

export function useProductMaterials(productId: string) {
  return useQuery({
    queryKey: ['product-materials', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_materials')
        .select(`
          *,
          raw_material:raw_materials(*)
        `)
        .eq('product_id', productId);
      
      if (error) throw error;
      return data as ProductMaterialWithDetails[];
    },
    enabled: !!productId,
  });
}

interface CreateProductMaterialInput {
  product_id: string;
  raw_material_id: string;
  quantity: number;
  source_type: MaterialSourceType;
  notes?: string;
}

export function useCreateProductMaterials() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inputs: CreateProductMaterialInput[]) => {
      const { data, error } = await supabase
        .from('product_materials')
        .insert(inputs)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const productId = variables[0]?.product_id;
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product-materials', productId] });
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Materials Added',
        description: 'Product materials have been saved successfully.',
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

export function useDeleteProductMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('product_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['product-materials', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Material Removed',
        description: 'Product material has been removed.',
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

export function useUpdateProductMaterials() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, materials }: { productId: string; materials: CreateProductMaterialInput[] }) => {
      // Delete existing materials for this product
      const { error: deleteError } = await supabase
        .from('product_materials')
        .delete()
        .eq('product_id', productId);
      
      if (deleteError) throw deleteError;

      // Insert new materials if any
      if (materials.length > 0) {
        const { data, error: insertError } = await supabase
          .from('product_materials')
          .insert(materials)
          .select();
        
        if (insertError) throw insertError;
        return data;
      }
      
      return [];
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-materials', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Materials Updated',
        description: 'Product materials have been updated successfully.',
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
