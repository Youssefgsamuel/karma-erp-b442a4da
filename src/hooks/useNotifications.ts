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
  // Get users with manufacture_manager and purchasing roles
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
