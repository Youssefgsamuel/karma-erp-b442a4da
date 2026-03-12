import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CustomerWithStats extends Customer {
  total_orders: number;
  total_revenue: number;
  outstanding_balance: number;
  interactions_count: number;
}

export interface CustomerInteraction {
  id: string;
  customer_id: string;
  interaction_type: string;
  subject: string | null;
  notes: string | null;
  contact_date: string;
  created_by: string | null;
  created_at: string;
}

export function useCustomersWithStats() {
  return useQuery({
    queryKey: ['customers-with-stats'],
    queryFn: async () => {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;

      // Get sales order stats per customer
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('customer_id, total, status')
        .is('deleted_at', null);

      // Get interactions count
      const { data: interactions } = await supabase
        .from('customer_interactions')
        .select('customer_id');

      const result: CustomerWithStats[] = (customers || []).map((c) => {
        const customerOrders = (orders || []).filter((o) => o.customer_id === c.id);
        const total_revenue = customerOrders
          .filter((o) => o.status !== 'cancelled')
          .reduce((s, o) => s + Number(o.total), 0);
        const outstanding = customerOrders
          .filter((o) => !['delivered', 'cancelled'].includes(o.status))
          .reduce((s, o) => s + Number(o.total), 0);
        const interCount = (interactions || []).filter((i) => i.customer_id === c.id).length;

        return {
          ...c,
          total_orders: customerOrders.length,
          total_revenue,
          outstanding_balance: outstanding,
          interactions_count: interCount,
        };
      });

      return result;
    },
  });
}

export function useCustomerInteractions(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-interactions', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('customer_interactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('contact_date', { ascending: false });
      if (error) throw error;
      return (data || []) as CustomerInteraction[];
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email?: string; phone?: string; address?: string }) => {
      const { error } = await supabase.from('customers').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-with-stats'] });
      toast.success('Customer created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { customer_id: string; interaction_type: string; subject?: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('customer_interactions').insert({
        ...input,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-interactions'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-stats'] });
      toast.success('Interaction logged');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
