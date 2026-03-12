import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '@/types/erp';
import { useAuth } from '@/contexts/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
  });
}

interface CreateNotificationInput {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  reference_type?: string;
  reference_id?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      ...input,
      type: input.type || 'info',
    });
  
  if (error) throw error;
}

export async function createShortageNotifications(
  moNumber: string, 
  moId: string,
  shortages: { name: string; required: number; available: number }[]
) {
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['manufacture_manager', 'purchasing', 'admin']);
  
  if (rolesError) throw rolesError;
  
  const uniqueUserIds = [...new Set(userRoles?.map(ur => ur.user_id) || [])];
  
  const shortageList = shortages
    .map(s => `${s.name}: need ${s.required}, have ${s.available}`)
    .join('; ');
  
  const notifications = uniqueUserIds.map(userId => ({
    user_id: userId,
    title: `Material Shortage Alert - ${moNumber}`,
    message: `Manufacturing order ${moNumber} has material shortages: ${shortageList}`,
    type: 'warning' as const,
    reference_type: 'manufacturing_order',
    reference_id: moId,
  }));
  
  if (notifications.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);
    
    if (error) throw error;
  }
}

/**
 * Check for low stock items and create notifications for relevant users.
 * Call this periodically or on inventory changes.
 */
export async function checkAndCreateLowStockAlerts() {
  // Get low stock products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, current_stock, minimum_stock')
    .is('deleted_at', null);

  const lowStockProducts = (products || []).filter(
    (p) => p.current_stock <= p.minimum_stock && p.minimum_stock > 0
  );

  // Get low stock materials
  const { data: materials } = await supabase
    .from('raw_materials')
    .select('id, name, sku, current_stock, reorder_point')
    .is('deleted_at', null);

  const lowStockMaterials = (materials || []).filter(
    (m) => m.current_stock <= m.reorder_point && m.reorder_point > 0
  );

  if (lowStockProducts.length === 0 && lowStockMaterials.length === 0) return;

  // Get admin and inventory manager users
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'inventory_manager', 'purchasing']);

  const userIds = [...new Set(userRoles?.map((ur) => ur.user_id) || [])];
  if (userIds.length === 0) return;

  const notifications: any[] = [];

  lowStockProducts.forEach((p) => {
    userIds.forEach((userId) => {
      notifications.push({
        user_id: userId,
        title: `Low Stock: ${p.name}`,
        message: `Product ${p.name} (${p.sku}) has ${p.current_stock} units, below minimum of ${p.minimum_stock}.`,
        type: 'warning',
        reference_type: 'product',
        reference_id: p.id,
      });
    });
  });

  lowStockMaterials.forEach((m) => {
    userIds.forEach((userId) => {
      notifications.push({
        user_id: userId,
        title: `Low Stock: ${m.name}`,
        message: `Material ${m.name} (${m.sku}) has ${m.current_stock} units, below reorder point of ${m.reorder_point}.`,
        type: 'warning',
        reference_type: 'raw_material',
        reference_id: m.id,
      });
    });
  });

  // Insert in batches to avoid duplicates (only create if no recent alert exists)
  for (const notif of notifications) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', notif.user_id)
      .eq('reference_type', notif.reference_type)
      .eq('reference_id', notif.reference_id)
      .eq('type', 'warning')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from('notifications').insert(notif);
    }
  }
}

/**
 * Create notification when a manufacturing order is completed
 */
export async function createMOCompletedNotification(moNumber: string, moId: string) {
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'manufacture_manager', 'inventory_manager']);

  const userIds = [...new Set(userRoles?.map((ur) => ur.user_id) || [])];

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    title: `MO Completed: ${moNumber}`,
    message: `Manufacturing order ${moNumber} has been completed and products are ready for inventory.`,
    type: 'success' as const,
    reference_type: 'manufacturing_order',
    reference_id: moId,
  }));

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }
}
