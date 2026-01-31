import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface QuotationEditHistory {
  id: string;
  quotation_id: string;
  edited_by: string | null;
  changes: Record<string, { old: unknown; new: unknown }>;
  previous_values: Record<string, unknown>;
  edited_at: string;
}

export function useQuotationEditHistory(quotationId: string) {
  return useQuery({
    queryKey: ['quotation-edit-history', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_edit_history')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('edited_at', { ascending: false });
      
      if (error) throw error;
      return data as QuotationEditHistory[];
    },
    enabled: !!quotationId,
  });
}

export function useCreateQuotationEditHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      quotation_id: string;
      changes: Record<string, { old: unknown; new: unknown }>;
      previous_values: Record<string, unknown>;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('quotation_edit_history')
        .insert([{
          quotation_id: input.quotation_id,
          edited_by: user?.id || null,
          changes: input.changes as Json,
          previous_values: input.previous_values as Json,
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Increment edit_count on quotation
      try {
        const { data: q } = await supabase
          .from('quotations')
          .select('edit_count')
          .eq('id', input.quotation_id)
          .single();
        
        if (q) {
          await supabase
            .from('quotations')
            .update({ edit_count: ((q as { edit_count?: number }).edit_count || 0) + 1 })
            .eq('id', input.quotation_id);
        }
      } catch {
        // Ignore if update fails
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotation-edit-history', variables.quotation_id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
}
