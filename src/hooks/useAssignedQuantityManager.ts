import { supabase } from '@/integrations/supabase/client';

/**
 * Helper to recalculate and update assigned_quantity for a product
 * based on active (pending/in_production) assignments
 */
export async function recalculateAssignedQuantity(productId: string) {
  const { data: currentAssignments } = await supabase
    .from('product_assignments')
    .select('quantity')
    .eq('product_id', productId)
    .in('status', ['pending', 'in_production']);

  const totalAssigned = currentAssignments?.reduce((sum, a) => sum + Number(a.quantity), 0) || 0;

  await supabase
    .from('products')
    .update({ assigned_quantity: totalAssigned })
    .eq('id', productId);
}

/**
 * Release assigned quantities when a quotation is cancelled or rejected
 */
export async function releaseAssignmentsForQuotation(quotationId: string) {
  // Get all assignments for this quotation (all statuses) so we can always recalculate
  const { data: assignments } = await supabase
    .from('product_assignments')
    .select('product_id')
    .eq('quotation_id', quotationId);

  if (!assignments || assignments.length === 0) return;

  // Mark active assignments as completed (released)
  await supabase
    .from('product_assignments')
    .update({ status: 'completed' })
    .eq('quotation_id', quotationId)
    .in('status', ['pending', 'in_production']);

  // Recalculate for each affected product (even if already completed)
  const productIds = [...new Set(assignments.map(a => a.product_id))];
  for (const productId of productIds) {
    await recalculateAssignedQuantity(productId);
  }
}

/**
 * Release assigned quantities when a sales order is shipped, delivered, or cancelled
 */
export async function releaseAssignmentsForSalesOrder(salesOrderId: string) {
  // Get the quotation_id from sales order
  const { data: salesOrder } = await supabase
    .from('sales_orders')
    .select('quotation_id')
    .eq('id', salesOrderId)
    .single();

  if (!salesOrder?.quotation_id) return;

  await releaseAssignmentsForQuotation(salesOrder.quotation_id);
}
