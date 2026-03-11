import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Branch = 'cairo' | 'north_coast';

export interface BranchInventoryItem {
  id: string;
  product_id: string;
  branch: Branch;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    selling_price: number;
    unit: string;
  };
}

export function useBranchInventory(branch?: Branch) {
  return useQuery({
    queryKey: ['branch-inventory', branch],
    queryFn: async () => {
      let query = supabase
        .from('branch_inventory')
        .select('*, product:products(id, name, sku, selling_price, unit)')
        .order('created_at', { ascending: false });

      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BranchInventoryItem[];
    },
  });
}

export function useDispatchToBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      branch,
      quantity,
    }: {
      productId: string;
      branch: Branch;
      quantity: number;
    }) => {
      // 1. Check main inventory has enough stock
      const { data: product, error: pErr } = await supabase
        .from('products')
        .select('current_stock, name, sku')
        .eq('id', productId)
        .single();

      if (pErr) throw pErr;
      if (!product || product.current_stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${product?.current_stock || 0}`);
      }

      // 2. Deduct from main inventory
      const { error: deductErr } = await supabase
        .from('products')
        .update({ current_stock: product.current_stock - quantity })
        .eq('id', productId);

      if (deductErr) throw deductErr;

      // 3. Upsert branch inventory
      const { data: existing } = await supabase
        .from('branch_inventory')
        .select('id, quantity')
        .eq('product_id', productId)
        .eq('branch', branch)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('branch_inventory')
          .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branch_inventory')
          .insert({ product_id: productId, branch, quantity });
        if (error) throw error;
      }

      // 4. Log transaction
      const branchLabel = branch === 'cairo' ? 'Cairo' : 'North Coast';
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('inventory_transactions').insert({
        product_id: productId,
        transaction_type: 'out' as any,
        quantity,
        reference_type: 'branch_transfer',
        notes: `Dispatched ${quantity} units to ${branchLabel} branch`,
        created_by: user?.id,
      });

      return { productName: product.name, branch: branchLabel, quantity };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['branch-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      toast.success(`Dispatched ${data.quantity} of ${data.productName} to ${data.branch}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
