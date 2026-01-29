import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Category, ProductType, UnitOfMeasure } from '@/types/erp';
import { useToast } from '@/hooks/use-toast';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .order('name');
      
      if (error) throw error;
      return data as (Product & { category: Category | null })[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Product & { category: Category | null };
    },
    enabled: !!id,
  });
}

interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  product_type: ProductType;
  unit: UnitOfMeasure;
  selling_price: number;
  cost_price: number;
  manufacturing_time_minutes: number;
  minimum_stock: number;
  current_stock: number;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data, error } = await supabase
        .from('products')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Product Created',
        description: 'The product has been created successfully.',
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

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateProductInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Product Updated',
        description: 'The product has been updated successfully.',
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

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if product is used in quotation_items
      const { data: quotationItems } = await supabase
        .from('quotation_items')
        .select('id')
        .eq('product_id', id)
        .limit(1);
      
      if (quotationItems && quotationItems.length > 0) {
        throw new Error('Cannot delete: This product is used in quotations. Remove it from quotations first.');
      }

      // Check if product is used in bom_items
      const { data: bomItems } = await supabase
        .from('bom_items')
        .select('id')
        .eq('product_id', id)
        .limit(1);
      
      if (bomItems && bomItems.length > 0) {
        throw new Error('Cannot delete: This product has a Bill of Materials. Remove the BOM first.');
      }

      // Check if product is used in manufacturing_orders
      const { data: moItems } = await supabase
        .from('manufacturing_orders')
        .select('id')
        .eq('product_id', id)
        .limit(1);
      
      if (moItems && moItems.length > 0) {
        throw new Error('Cannot delete: This product has manufacturing orders. Delete those first.');
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Product Deleted',
        description: 'The product has been deleted successfully.',
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

export function useBulkCreateProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (items: Omit<CreateProductInput, 'category_id'>[]) => {
      const { data, error } = await supabase
        .from('products')
        .insert(items)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Bulk Import Successful',
        description: `${data.length} products imported.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Bulk Import Failed',
        description: error.message,
      });
    },
  });
}
