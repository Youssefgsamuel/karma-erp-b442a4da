import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

export interface FinanceSummary {
  totalInventoryValue: number;
  totalRawMaterialValue: number;
  totalProductValue: number;
  estimatedCOGS: number;
  totalQuotationsValue: number;
  totalSalesOrdersValue: number;
  pendingOrdersValue: number;
}

export interface ExpectedRevenue {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  due_date: string | null;
  order_date: string;
}

export interface ExpectedPayment {
  supplier_id: string;
  supplier_name: string;
  payment_terms: string;
  total_value: number;
  expected_payment_date: string;
  materials_count: number;
}

export function useFinanceSummary() {
  return useQuery({
    queryKey: ['finance_summary'],
    queryFn: async () => {
      const { data: rawMaterials, error: rmError } = await supabase
        .from('raw_materials')
        .select('current_stock, cost_per_unit');
      if (rmError) throw rmError;

      const { data: products, error: pError } = await supabase
        .from('products')
        .select('current_stock, selling_price');
      if (pError) throw pError;

      const { data: quotations, error: qError } = await supabase
        .from('quotations')
        .select('total, status');
      if (qError) throw qError;

      const { data: salesOrders, error: soError } = await supabase
        .from('sales_orders')
        .select('total, status');
      if (soError) throw soError;

      const totalRawMaterialValue = rawMaterials?.reduce(
        (sum, rm) => sum + (Number(rm.current_stock) * Number(rm.cost_per_unit)), 0
      ) || 0;

      const totalProductValue = products?.reduce(
        (sum, p) => sum + (Number(p.current_stock) * Number(p.selling_price)), 0
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
        estimatedCOGS: totalRawMaterialValue * 0.7,
        totalQuotationsValue,
        totalSalesOrdersValue,
        pendingOrdersValue,
      } as FinanceSummary;
    },
  });
}

export function useExpectedRevenue() {
  return useQuery({
    queryKey: ['expected_revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('id, order_number, customer_name, total, status, due_date, order_date')
        .in('status', ['pending', 'confirmed', 'processing', 'ready_to_deliver', 'shipped'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data || []) as ExpectedRevenue[];
    },
  });
}

export function useExpectedPayments() {
  return useQuery({
    queryKey: ['expected_payments'],
    queryFn: async () => {
      // Get suppliers with their payment terms
      const { data: suppliers, error: sError } = await supabase
        .from('suppliers')
        .select('id, name, payment_terms, payment_terms_notes')
        .eq('is_active', true);
      if (sError) throw sError;

      // Get raw materials grouped by supplier
      const { data: materials, error: mError } = await supabase
        .from('raw_materials')
        .select('supplier_id, current_stock, cost_per_unit, updated_at');
      if (mError) throw mError;

      const payments: ExpectedPayment[] = [];
      const today = new Date();

      for (const supplier of (suppliers || [])) {
        if (!supplier.payment_terms || supplier.payment_terms === 'Cash') continue;

        const supplierMaterials = (materials || []).filter(m => m.supplier_id === supplier.id);
        if (supplierMaterials.length === 0) continue;

        const totalValue = supplierMaterials.reduce(
          (sum, m) => sum + (Number(m.current_stock) * Number(m.cost_per_unit)), 0
        );

        let daysToAdd = 0;
        if (supplier.payment_terms === '30 days') daysToAdd = 30;
        else if (supplier.payment_terms === '60 days') daysToAdd = 60;
        else if (supplier.payment_terms === '90 days') daysToAdd = 90;
        else continue; // Skip 'Other' without known days

        const expectedDate = addDays(today, daysToAdd);

        payments.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          payment_terms: supplier.payment_terms,
          total_value: totalValue,
          expected_payment_date: format(expectedDate, 'yyyy-MM-dd'),
          materials_count: supplierMaterials.length,
        });
      }

      return payments.sort((a, b) => a.expected_payment_date.localeCompare(b.expected_payment_date));
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
