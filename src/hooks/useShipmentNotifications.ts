import { supabase } from '@/integrations/supabase/client';
import { releaseAssignmentsForSalesOrder } from './useAssignedQuantityManager';

interface ShippedItem {
  product_id: string;
  quantity: number;
  product_name: string;
}

/**
 * Send notifications to Inventory Manager and Manufacture Manager when an order is shipped
 */
export async function sendShipmentNotifications(
  orderNumber: string,
  orderId: string,
  items: ShippedItem[]
) {
  // Get users with inventory_manager and manufacture_manager roles
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['inventory_manager', 'manufacture_manager', 'admin']);
  
  if (rolesError) throw rolesError;
  
  const uniqueUserIds = [...new Set(userRoles?.map(ur => ur.user_id) || [])];
  
  const itemsList = items.map(i => `${i.product_name}: ${i.quantity} pcs`).join('; ');
  
  const notifications = uniqueUserIds.map(userId => ({
    user_id: userId,
    title: `Order Shipped - ${orderNumber}`,
    message: `Sales order ${orderNumber} has been shipped. Items: ${itemsList}. Stock has been updated.`,
    type: 'info' as const,
    reference_type: 'sales_order',
    reference_id: orderId,
  }));
  
  if (notifications.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);
    
    if (error) throw error;
  }
}

/**
 * Handle shipment processing: release assigned quantities and send notifications
 */
export async function processShipment(
  orderId: string,
  orderNumber: string
) {
  // Get the quotation_id from sales order
  const { data: salesOrder } = await supabase
    .from('sales_orders')
    .select('quotation_id')
    .eq('id', orderId)
    .single();

  if (!salesOrder?.quotation_id) return;

  // Get quotation items with product info (for notification details)
  const { data: quotationItems } = await supabase
    .from('quotation_items')
    .select('product_id, quantity, description')
    .eq('quotation_id', salesOrder.quotation_id)
    .not('product_id', 'is', null);

  const shippedItems: ShippedItem[] = (quotationItems || []).map(item => ({
    product_id: item.product_id!,
    quantity: item.quantity,
    product_name: item.description,
  }));

  // Deduct stock only for quantities that came from manufacturing assignments
  // (inventory-only quantities are already deducted at quotation acceptance)
  const { data: assignments } = await supabase
    .from('product_assignments')
    .select('product_id, quantity')
    .eq('quotation_id', salesOrder.quotation_id);

  const assignmentByProduct = (assignments || []).reduce<Record<string, number>>((acc, assignment) => {
    const key = assignment.product_id;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + Number(assignment.quantity || 0);
    return acc;
  }, {});

  for (const [productId, assignedQty] of Object.entries(assignmentByProduct)) {
    if (assignedQty <= 0) continue;

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    const currentStock = Number(product.current_stock || 0);
    const shippedQty = Math.min(currentStock, assignedQty);

    if (shippedQty <= 0) continue;

    await supabase
      .from('products')
      .update({ current_stock: currentStock - shippedQty })
      .eq('id', productId);

    await supabase.from('inventory_transactions').insert({
      product_id: productId,
      transaction_type: 'out',
      quantity: shippedQty,
      notes: `Shipped manufactured quantity for SO ${orderNumber}`,
      reference_type: 'sales_order',
      reference_id: orderId,
    });
  }

  // Release assigned quantities
  await releaseAssignmentsForSalesOrder(orderId);

  // Send notifications
  if (shippedItems.length > 0) {
    await sendShipmentNotifications(orderNumber, orderId, shippedItems);
  }
}
