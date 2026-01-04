import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinanceSummary {
  totalInventoryValue: number;
  totalRawMaterialValue: number;
  totalProductValue: number;
  estimatedCOGS: number;
  totalQuotationsValue: number;
  totalSalesOrdersValue: number;
  pendingOrdersValue: number;
}

export function useFinanceSummary() {
  return useQuery({
    queryKey: ['finance_summary'],
    queryFn: async () => {
      // Fetch raw materials for inventory value
      const { data: rawMaterials, error: rmError } = await supabase
        .from('raw_materials')
        .select('current_stock, cost_per_unit');
      
      if (rmError) throw rmError;

      // Fetch products for inventory value
      const { data: products, error: pError } = await supabase
        .from('products')
        .select('current_stock, selling_price');
      
      if (pError) throw pError;

      // Fetch quotations
      const { data: quotations, error: qError } = await supabase
        .from('quotations')
        .select('total, status');
      
      if (qError) throw qError;

      // Fetch sales orders
      const { data: salesOrders, error: soError } = await supabase
        .from('sales_orders')
        .select('total, status');
      
      if (soError) throw soError;

      // Calculate values
      const totalRawMaterialValue = rawMaterials?.reduce(
        (sum, rm) => sum + (Number(rm.current_stock) * Number(rm.cost_per_unit)), 
        0
      ) || 0;

      const totalProductValue = products?.reduce(
        (sum, p) => sum + (Number(p.current_stock) * Number(p.selling_price)), 
        0
      ) || 0;

      const totalQuotationsValue = quotations
        ?.filter(q => q.status === 'accepted' || q.status === 'sent')
        .reduce((sum, q) => sum + Number(q.total), 0) || 0;

      const totalSalesOrdersValue = salesOrders
        ?.filter(so => so.status !== 'cancelled')
        .reduce((sum, so) => sum + Number(so.total), 0) || 0;

      const pendingOrdersValue = salesOrders
        ?.filter(so => ['pending', 'confirmed', 'in_production'].includes(so.status))
        .reduce((sum, so) => sum + Number(so.total), 0) || 0;

      return {
        totalInventoryValue: totalRawMaterialValue + totalProductValue,
        totalRawMaterialValue,
        totalProductValue,
        estimatedCOGS: totalRawMaterialValue * 0.7, // Simplified estimate
        totalQuotationsValue,
        totalSalesOrdersValue,
        pendingOrdersValue,
      } as FinanceSummary;
    },
  });
}

export function useInventoryTransactions() {
  return useQuery({
    queryKey: ['inventory_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, raw_material:raw_materials(name), product:products(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });
}
