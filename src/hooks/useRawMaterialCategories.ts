import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RawMaterialCategory } from '@/types/erp';
import { useToast } from '@/hooks/use-toast';

export function useRawMaterialCategories() {
  return useQuery({
    queryKey: ['raw-material-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as RawMaterialCategory[];
    },
  });
}

interface CreateRawMaterialCategoryInput {
  name: string;
  description?: string;
}

export function useCreateRawMaterialCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateRawMaterialCategoryInput) => {
      const { data, error } = await supabase
        .from('raw_material_categories')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-material-categories'] });
      toast({
        title: 'Category Created',
        description: 'The raw material category has been created successfully.',
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
