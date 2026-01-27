import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RawMaterialTransaction {
  id: string;
  raw_material_id: string;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export function useRawMaterialTransactions(rawMaterialId: string) {
  return useQuery({
    queryKey: ['raw-material-transactions', rawMaterialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('raw_material_id', rawMaterialId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RawMaterialTransaction[];
    },
    enabled: !!rawMaterialId,
  });
}
