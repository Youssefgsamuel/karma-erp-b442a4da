import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManufacturingOrder {
  id: string;
  mo_number: string;
  product_id: string;
  quantity: number;
  status: 'planned' | 'in_progress' | 'under_qc' | 'completed' | 'qc_rejected' | 'closed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sales_order_id: string | null;
  quotation_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  product?: { name: string; sku: string } | null;
}

export interface CreateMOInput {
  product_id: string;
  quantity: number;
  priority?: ManufacturingOrder['priority'];
  planned_start?: string;
  planned_end?: string;
  sales_order_id?: string;
  notes?: string;
}

async function generateMONumber() {
  const { data } = await supabase
    .from('manufacturing_orders')
    .select('mo_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const lastNum = data?.[0]?.mo_number;
  const nextNum = lastNum ? parseInt(lastNum.replace('MO-', '')) + 1 : 1;
  return `MO-${String(nextNum).padStart(5, '0')}`;
}

// Helper to deduct BOM materials from raw materials inventory
async function deductBomMaterials(productId: string, quantity: number, moId: string, moNumber: string) {
  // Get BOM items for this product
  const { data: bomItems, error: bomError } = await supabase
    .from('bom_items')
    .select('raw_material_id, quantity')
    .eq('product_id', productId);

  if (bomError) throw bomError;
  if (!bomItems || bomItems.length === 0) return;

  // Deduct each material
  for (const item of bomItems) {
    const requiredQty = Number(item.quantity) * Number(quantity);

    // Get current stock
    const { data: material, error: matError } = await supabase
      .from('raw_materials')
      .select('current_stock')
      .eq('id', item.raw_material_id)
      .single();

    if (matError) continue;

    const newStock = Math.max(0, Number(material.current_stock) - requiredQty);
    
    // Update raw material stock
    await supabase
      .from('raw_materials')
      .update({ current_stock: newStock })
      .eq('id', item.raw_material_id);

    // Record inventory transaction
    await supabase.from('inventory_transactions').insert({
      raw_material_id: item.raw_material_id,
      transaction_type: 'out' as const,
      quantity: requiredQty,
      reference_type: 'manufacturing_order',
      reference_id: moId,
      notes: `Material consumed for MO ${moNumber}`,
    });
  }
}

// Helper to check for shortages and send notifications
async function checkAndNotifyShortages(productId: string, quantity: number, moNumber: string, moId: string) {
  const { data: bomItems } = await supabase
    .from('bom_items')
    .select(`
      quantity,
      raw_material:raw_materials(id, name, current_stock)
    `)
    .eq('product_id', productId);

  if (!bomItems || bomItems.length === 0) return;

  const shortages: { name: string; shortage: number }[] = [];
  
  for (const item of bomItems as any[]) {
    const requiredQty = Number(item.quantity) * Number(quantity);
    const availableQty = Number(item.raw_material?.current_stock || 0);
    const shortage = requiredQty - availableQty;
    
    if (shortage > 0) {
      shortages.push({
        name: item.raw_material?.name || 'Unknown',
        shortage,
      });
    }
  }

  if (shortages.length > 0) {
    // Get users with manufacture_manager and purchasing roles
    const { data: roleUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manufacture_manager', 'purchasing']);

    if (roleUsers && roleUsers.length > 0) {
      const shortageText = shortages.map(s => `${s.name}: ${s.shortage} units short`).join(', ');
      const notifications = roleUsers.map((u: { user_id: string }) => ({
        user_id: u.user_id,
        title: 'Material Shortage Alert',
        message: `MO ${moNumber} has material shortages: ${shortageText}`,
        type: 'warning' as const,
        reference_type: 'manufacturing_order',
        reference_id: moId,
      }));

      await supabase.from('notifications').insert(notifications);
    }
  }
}

export function useManufacturingOrders() {
  return useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manufacturing_orders')
        .select('*, product:products(name, sku)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ManufacturingOrder[];
    },
  });
}

export function useManufacturingOrder(id: string) {
  return useQuery({
    queryKey: ['manufacturing_orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manufacturing_orders')
        .select('*, product:products(name, sku)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ManufacturingOrder | null;
    },
    enabled: !!id,
  });
}

export function useCreateManufacturingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMOInput) => {
      const mo_number = await generateMONumber();

      const { data, error } = await supabase
        .from('manufacturing_orders')
        .insert({
          mo_number,
          product_id: input.product_id,
          quantity: input.quantity,
          priority: input.priority || 'normal',
          planned_start: input.planned_start,
          planned_end: input.planned_end,
          sales_order_id: input.sales_order_id,
          notes: input.notes,
        })
        .select('*, product:products(name, sku)')
        .single();

      if (error) throw error;

      // Check for shortages and send notifications (don't block)
      await checkAndNotifyShortages(input.product_id, input.quantity, mo_number, data.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Manufacturing Order created');
    },
    onError: (error) => {
      toast.error(`Failed to create MO: ${error.message}`);
    },
  });
}

export function useUpdateManufacturingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ManufacturingOrder> & { id: string }) => {
      // Get current MO state
      const { data: currentMO } = await supabase
        .from('manufacturing_orders')
        .select('*, product:products(name, sku)')
        .eq('id', id)
        .single();

      const updateData: Record<string, unknown> = { ...updates };
      
      // Handle status transitions
      if (updates.status === 'in_progress' && currentMO?.status === 'planned') {
        updateData.actual_start = new Date().toISOString();
        
        // Deduct raw materials when starting production
        await deductBomMaterials(currentMO.product_id, currentMO.quantity, id, currentMO.mo_number);
      }
      
      // When marked as "completed" by production, move to QC
      if (updates.status === 'completed' && currentMO?.status === 'in_progress') {
        updateData.status = 'under_qc';
        updateData.actual_end = new Date().toISOString();

        // Fetch all mo_items for this MO
        const { data: moItems } = await supabase
          .from('mo_items')
          .select('product_id, quantity')
          .eq('mo_id', id);

        // Create QC records for primary product + all mo_items
        const qcRecords = [
          {
            mo_id: id,
            product_id: currentMO.product_id,
            quantity: currentMO.quantity,
            status: 'under_review',
          },
          ...(moItems || []).map(item => ({
            mo_id: id,
            product_id: item.product_id,
            quantity: item.quantity,
            status: 'under_review',
          })),
        ];

        await supabase.from('quality_control_records').insert(qcRecords);
      }

      const { data, error } = await supabase
        .from('manufacturing_orders')
        .update(updateData)
        .eq('id', id)
        .select('*, product:products(name, sku)')
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-records'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-counts'] });
      
      if (data?.status === 'under_qc') {
        toast.success('MO sent to Quality Control');
      } else {
        toast.success('Manufacturing Order updated');
      }
    },
    onError: (error) => {
      toast.error(`Failed to update MO: ${error.message}`);
    },
  });
}

export function useDeleteManufacturingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: string | { id: string; reason?: string }) => {
      const moId = typeof input === 'string' ? input : input.id;
      const deletionReason = typeof input === 'string' ? undefined : input.reason;

      // Fetch MO data for audit trail
      const { data: moData, error: fetchError } = await supabase
        .from('manufacturing_orders')
        .select('*')
        .eq('id', moId)
        .single();

      if (fetchError) throw fetchError;

      // Record in audit trail
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('mo_deletion_audit').insert({
        mo_number: moData.mo_number,
        mo_id: moId,
        deleted_by: user?.id || null,
        deletion_reason: deletionReason || null,
        mo_data: moData,
      });

      const { error } = await supabase
        .from('manufacturing_orders')
        .delete()
        .eq('id', moId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      toast.success('Manufacturing Order deleted (recorded in audit trail)');
    },
    onError: (error) => {
      toast.error(`Failed to delete MO: ${error.message}`);
    },
  });
}
