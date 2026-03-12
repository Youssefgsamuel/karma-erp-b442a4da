import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string | null;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'closed';
  order_date: string;
  expected_date: string | null;
  subtotal: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  supplier?: { id: string; name: string } | null;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  raw_material_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
  received_quantity: number;
  created_at: string;
  raw_material?: { id: string; name: string; sku: string; unit: string } | null;
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(id, name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PurchaseOrder[];
    },
  });
}

export function usePurchaseOrder(id: string | null) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(id, name)')
        .eq('id', id)
        .single();
      if (error) throw error;

      const { data: items, error: itemsErr } = await supabase
        .from('purchase_order_items')
        .select('*, raw_material:raw_materials(id, name, sku, unit)')
        .eq('po_id', id)
        .order('created_at');
      if (itemsErr) throw itemsErr;

      return { ...data, items: items || [] } as PurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      supplier_id: string;
      expected_date?: string;
      notes?: string;
      items: { raw_material_id?: string; description: string; quantity: number; unit_cost: number }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Generate PO number
      const { data: lastPO } = await supabase
        .from('purchase_orders')
        .select('po_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (lastPO?.po_number) {
        const match = lastPO.po_number.match(/PO-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const po_number = `PO-${String(nextNum).padStart(5, '0')}`;

      const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
      const total = subtotal;

      const { data: po, error } = await supabase
        .from('purchase_orders')
        .insert({
          po_number,
          supplier_id: input.supplier_id,
          expected_date: input.expected_date || null,
          notes: input.notes || null,
          subtotal,
          total,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert items
      const itemsToInsert = input.items.map((item) => ({
        po_id: po.id,
        raw_material_id: item.raw_material_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total: item.quantity * item.unit_cost,
      }));

      const { error: itemsErr } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdatePOStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      toast.success('PO status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReceivePOItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ poId, items }: { poId: string; items: { id: string; raw_material_id: string | null; received: number }[] }) => {
      const { data: { user } } = await supabase.auth.getUser();

      for (const item of items) {
        if (item.received <= 0) continue;

        // Update received quantity
        const { data: current } = await supabase
          .from('purchase_order_items')
          .select('received_quantity')
          .eq('id', item.id)
          .single();

        await supabase
          .from('purchase_order_items')
          .update({ received_quantity: (current?.received_quantity || 0) + item.received })
          .eq('id', item.id);

        // Update raw material stock
        if (item.raw_material_id) {
          const { data: mat } = await supabase
            .from('raw_materials')
            .select('current_stock')
            .eq('id', item.raw_material_id)
            .single();

          if (mat) {
            await supabase
              .from('raw_materials')
              .update({ current_stock: mat.current_stock + item.received })
              .eq('id', item.raw_material_id);
          }

          // Log inventory transaction
          await supabase.from('inventory_transactions').insert({
            raw_material_id: item.raw_material_id,
            transaction_type: 'in' as any,
            quantity: item.received,
            reference_type: 'purchase_order',
            reference_id: poId,
            notes: `Received from PO`,
            created_by: user?.id,
          });
        }
      }

      // Check if all items fully received → auto-close
      const { data: allItems } = await supabase
        .from('purchase_order_items')
        .select('quantity, received_quantity')
        .eq('po_id', poId);

      const allReceived = allItems?.every((i) => i.received_quantity >= i.quantity);
      const someReceived = allItems?.some((i) => i.received_quantity > 0);

      if (allReceived) {
        await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', poId);
      } else if (someReceived) {
        await supabase.from('purchase_orders').update({ status: 'partial' }).eq('id', poId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      toast.success('Items received and inventory updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
