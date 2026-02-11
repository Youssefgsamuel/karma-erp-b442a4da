import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Package, ShoppingCart, TrendingUp, Warehouse, Clock, CalendarDays, CreditCard } from 'lucide-react';
import { useFinanceSummary, useExpectedRevenue, useExpectedPayments, ExpectedRevenue, ExpectedPayment } from '@/hooks/useFinance';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function Finance() {
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary();
  const { data: revenue = [], isLoading: revenueLoading } = useExpectedRevenue();
  const { data: payments = [], isLoading: paymentsLoading } = useExpectedPayments();

  const totalExpectedRevenue = revenue.reduce((sum, r) => sum + Number(r.total), 0);
  const totalExpectedPayments = payments.reduce((sum, p) => sum + p.total_value, 0);

  const revenueColumns: Column<ExpectedRevenue>[] = [
    { key: 'order_number', header: 'Order #', cell: (r) => <span className="font-medium">{r.order_number}</span> },
    { key: 'customer', header: 'Customer', cell: (r) => r.customer_name },
    { key: 'total', header: 'Amount', cell: (r) => <span className="font-medium">{formatCurrency(r.total)}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge> },
    { key: 'due_date', header: 'Expected Date', cell: (r) => r.due_date ? format(new Date(r.due_date), 'MMM d, yyyy') : format(new Date(r.order_date), 'MMM d, yyyy') },
  ];

  const paymentColumns: Column<ExpectedPayment>[] = [
    { key: 'supplier', header: 'Supplier', cell: (p) => <span className="font-medium">{p.supplier_name}</span> },
    { key: 'terms', header: 'Terms', cell: (p) => <Badge variant="outline">{p.payment_terms}</Badge> },
    { key: 'value', header: 'Amount', cell: (p) => <span className="font-medium">{formatCurrency(p.total_value)}</span> },
    { key: 'materials', header: 'Materials', cell: (p) => p.materials_count },
    { key: 'date', header: 'Expected Date', cell: (p) => format(new Date(p.expected_payment_date), 'MMM d, yyyy') },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Finance" description="Track revenues, costs, and profitability." />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Inventory Value"
          value={summaryLoading ? '...' : formatCurrency(summary?.totalInventoryValue || 0)}
          icon={Warehouse}
          subtitle="Raw materials + finished products"
        />
        <StatCard
          title="Raw Materials Value"
          value={summaryLoading ? '...' : formatCurrency(summary?.totalRawMaterialValue || 0)}
          icon={Package}
          subtitle="Current stock value"
        />
        <StatCard
          title="Expected Revenue"
          value={revenueLoading ? '...' : formatCurrency(totalExpectedRevenue)}
          icon={CalendarDays}
          subtitle={`${revenue.length} active orders`}
        />
        <StatCard
          title="Expected Payments"
          value={paymentsLoading ? '...' : formatCurrency(totalExpectedPayments)}
          icon={CreditCard}
          subtitle={`${payments.length} supplier payments`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active Quotations"
          value={summaryLoading ? '...' : formatCurrency(summary?.totalQuotationsValue || 0)}
          icon={DollarSign}
          subtitle="Sent + accepted"
        />
        <StatCard
          title="Sales Orders"
          value={summaryLoading ? '...' : formatCurrency(summary?.totalSalesOrdersValue || 0)}
          icon={TrendingUp}
          subtitle="Total orders value"
        />
        <StatCard
          title="Pending Orders"
          value={summaryLoading ? '...' : formatCurrency(summary?.pendingOrdersValue || 0)}
          icon={Clock}
          subtitle="Awaiting fulfillment"
        />
      </div>

      {/* Expected Revenue Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Expected Revenue</h2>
        <DataTable
          columns={revenueColumns}
          data={revenue}
          keyExtractor={(r) => r.id}
          isLoading={revenueLoading}
          emptyMessage="No expected revenue from active sales orders."
        />
      </div>

      {/* Expected Payments Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Expected Supplier Payments</h2>
        <DataTable
          columns={paymentColumns}
          data={payments}
          keyExtractor={(p) => p.supplier_id}
          isLoading={paymentsLoading}
          emptyMessage="No expected supplier payments based on current payment terms."
        />
      </div>
    </div>
  );
}
