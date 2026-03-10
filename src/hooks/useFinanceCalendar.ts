import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

interface CalendarEvent {
  date: string;
  type: 'revenue' | 'payment' | 'salary';
  label: string;
  amount: number;
}

export function useFinanceCalendarEvents() {
  return useQuery({
    queryKey: ['finance_calendar_events'],
    queryFn: async () => {
      const revenueEvents: CalendarEvent[] = [];
      const paymentEvents: CalendarEvent[] = [];
      const salaryEvents: CalendarEvent[] = [];

      // 1. Expected Revenue from sales orders (not yet delivered/cancelled)
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, order_number, customer_name, total, status, due_date, order_date')
        .in('status', ['pending', 'confirmed', 'processing', 'shipped'])
        .is('deleted_at', null);

      for (const order of orders || []) {
        const date = order.due_date || order.order_date;
        revenueEvents.push({
          date,
          type: 'revenue',
          label: `${order.order_number} - ${order.customer_name}`,
          amount: Number(order.total),
        });
      }

      // 2. Expected Supplier Payments
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, payment_terms')
        .eq('is_active', true);

      const { data: materials } = await supabase
        .from('raw_materials')
        .select('supplier_id, current_stock, cost_per_unit');

      const today = new Date();
      for (const supplier of suppliers || []) {
        if (!supplier.payment_terms || supplier.payment_terms === 'Cash') continue;

        let daysToAdd = 0;
        if (supplier.payment_terms === '30 days') daysToAdd = 30;
        else if (supplier.payment_terms === '60 days') daysToAdd = 60;
        else if (supplier.payment_terms === '90 days') daysToAdd = 90;
        else continue;

        const supplierMats = (materials || []).filter(m => m.supplier_id === supplier.id);
        if (supplierMats.length === 0) continue;

        const totalValue = supplierMats.reduce(
          (sum, m) => sum + Number(m.current_stock) * Number(m.cost_per_unit), 0
        );

        if (totalValue > 0) {
          paymentEvents.push({
            date: format(addDays(today, daysToAdd), 'yyyy-MM-dd'),
            type: 'payment',
            label: `Payment to ${supplier.name}`,
            amount: totalValue,
          });
        }
      }

      // 3. Salary payments (pending salaries)
      const { data: salaries } = await supabase
        .from('salaries')
        .select('id, employee_name, employee_number, net_pay, payment_date, month, year, payment_status')
        .eq('payment_status', 'pending');

      for (const salary of salaries || []) {
        const date = salary.payment_date || `${salary.year}-${String(salary.month).padStart(2, '0')}-28`;
        salaryEvents.push({
          date,
          type: 'salary',
          label: `Salary: ${salary.employee_name || salary.employee_number}`,
          amount: Number(salary.net_pay || 0),
        });
      }

      return { revenueEvents, paymentEvents, salaryEvents };
    },
  });
}
