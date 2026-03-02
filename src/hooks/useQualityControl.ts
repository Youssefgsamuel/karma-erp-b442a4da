import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { recalculateAssignedQuantity } from './useAssignedQuantityManager';

export interface QualityControlRecord {
  id: string;
  mo_id: string;
  product_id: string;
  quantity: number;
  status: 'under_review' | 'accepted' | 'rejected';
  inspector_id: string | null;
  inspected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  manufacturing_order?: {
    mo_number: string;
    status: string;
  } | null;
  product?: {
    name: string;
    sku: string;
  } | null;
  inspector?: {
    full_name: string;
  } | null;
}

export function useQualityControlRecords(filter?: 'under_review' | 'accepted' | 'rejected') {
  return useQuery({
    queryKey: ['quality-control-records', filter],
    queryFn: async () => {
      let query = supabase
        .from('quality_control_records')
        .select(`
          *,
          manufacturing_order:manufacturing_orders(mo_number, status),
          product:products(name, sku),
          inspector:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filter) {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QualityControlRecord[];
    },
  });
}

export function useQualityControlCounts() {
  return useQuery({
    queryKey: ['quality-control-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quality_control_records')
        .select('status');

      if (error) throw error;

      const counts = {
        under_review: 0,
        accepted: 0,
        rejected: 0,
        total: data.length,
      };

      data.forEach((record: { status: string }) => {
        if (record.status === 'under_review') counts.under_review++;
        else if (record.status === 'accepted') counts.accepted++;
        else if (record.status === 'rejected') counts.rejected++;
      });

      return counts;
    },
  });
}

export function useAcceptQualityControl() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ qcId, notes }: { qcId: string; notes?: string }) => {
      // Get profile id for the current user
      let profileId: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        profileId = profile?.id || null;
      }

      // Get QC record
      const { data: qcRecord, error: qcError } = await supabase
        .from('quality_control_records')
        .select('*, manufacturing_order:manufacturing_orders(*)')
        .eq('id', qcId)
        .single();

      if (qcError) throw qcError;

      // Update QC record to accepted
      const { error: updateQcError } = await supabase
        .from('quality_control_records')
        .update({
          status: 'accepted',
          inspector_id: profileId,
          inspected_at: new Date().toISOString(),
          notes,
        })
        .eq('id', qcId);

      if (updateQcError) throw updateQcError;

      const mo = qcRecord.manufacturing_order as { sales_order_id: string | null; mo_number: string; quotation_id: string | null };

      // Add finished goods to inventory for the accepted QC line only
      const { data: product } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', qcRecord.product_id)
        .single();

      if (product) {
        const newStock = Number(product.current_stock) + Number(qcRecord.quantity);
        await supabase
          .from('products')
          .update({ current_stock: newStock })
          .eq('id', qcRecord.product_id);

        await supabase.from('inventory_transactions').insert({
          product_id: qcRecord.product_id,
          transaction_type: 'in' as const,
          quantity: qcRecord.quantity,
          reference_type: 'quality_control',
          reference_id: qcId,
          notes: `QC Accepted for MO ${mo.mo_number}`,
        });
      }

      // Only close MO / mark SO ready when all QC records are accepted
      const { data: moQcRecords, error: moQcError } = await supabase
        .from('quality_control_records')
        .select('status')
        .eq('mo_id', qcRecord.mo_id);

      if (moQcError) throw moQcError;

      const allAccepted = (moQcRecords || []).length > 0 && (moQcRecords || []).every((record) => record.status === 'accepted');

      if (allAccepted) {
        const { error: updateMoError } = await supabase
          .from('manufacturing_orders')
          .update({ status: 'closed' })
          .eq('id', qcRecord.mo_id);

        if (updateMoError) throw updateMoError;

        if (mo.quotation_id) {
          await supabase
            .from('product_assignments')
            .update({ status: 'completed' })
            .eq('mo_id', qcRecord.mo_id);

          const { data: assignmentProducts } = await supabase
            .from('product_assignments')
            .select('product_id')
            .eq('mo_id', qcRecord.mo_id);

          const productIds = [...new Set((assignmentProducts || []).map((assignment: { product_id: string }) => assignment.product_id))];
          for (const productId of productIds) {
            await recalculateAssignedQuantity(productId);
          }
        }

        if (mo.sales_order_id) {
          await supabase
            .from('sales_orders')
            .update({ status: 'ready_to_deliver' })
            .eq('id', mo.sales_order_id);
        }
      }

      return qcRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control-records'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-counts'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('QC Accepted - Stock updated');
    },
    onError: (error) => {
      toast.error(`Failed to accept QC: ${error.message}`);
    },
  });
}

export function useRejectQualityControl() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ qcId, rejectionReason }: { qcId: string; rejectionReason: string }) => {
      // Get profile id for the current user
      let profileId: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        profileId = profile?.id || null;
      }

      // Get QC record
      const { data: qcRecord, error: qcError } = await supabase
        .from('quality_control_records')
        .select('*, manufacturing_order:manufacturing_orders(mo_number)')
        .eq('id', qcId)
        .single();

      if (qcError) throw qcError;

      // Update QC record to rejected
      const { error: updateQcError } = await supabase
        .from('quality_control_records')
        .update({
          status: 'rejected',
          inspector_id: profileId,
          inspected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', qcId);

      if (updateQcError) throw updateQcError;

      // Update MO status to qc_rejected
      const { error: updateMoError } = await supabase
        .from('manufacturing_orders')
        .update({ status: 'qc_rejected' })
        .eq('id', qcRecord.mo_id);

      if (updateMoError) throw updateMoError;

      // Send notifications to Admin and Manufacture Manager
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'manufacture_manager']);

      if (adminUsers && adminUsers.length > 0) {
        const mo = qcRecord.manufacturing_order as any;
        const notifications = adminUsers.map((u: { user_id: string }) => ({
          user_id: u.user_id,
          title: 'Quality Control Rejected',
          message: `MO ${mo.mo_number} failed quality control: ${rejectionReason}`,
          type: 'error' as const,
          reference_type: 'quality_control',
          reference_id: qcId,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      return qcRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control-records'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-counts'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('QC Rejected - Alerts sent');
    },
    onError: (error) => {
      toast.error(`Failed to reject QC: ${error.message}`);
    },
  });
}

export function useAssignInspector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ qcId, inspectorId }: { qcId: string; inspectorId: string }) => {
      const { error } = await supabase
        .from('quality_control_records')
        .update({ inspector_id: inspectorId })
        .eq('id', qcId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control-records'] });
      toast.success('Inspector assigned');
    },
    onError: (error) => {
      toast.error(`Failed to assign inspector: ${error.message}`);
    },
  });
}
