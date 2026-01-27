import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DollarSign, Package, ShoppingCart, TrendingUp, Warehouse, Clock } from 'lucide-react';
import { useFinanceSummary } from '@/hooks/useFinance';

export default function Finance() {
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary();

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Finance"
        description="Track revenues, costs, and profitability."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Inventory Value"
          value={summaryLoading ? '...' : `$${summary?.totalInventoryValue.toFixed(2)}`}
          icon={Warehouse}
          subtitle="Raw materials + finished products"
        />
        <StatCard
          title="Raw Materials Value"
          value={summaryLoading ? '...' : `$${summary?.totalRawMaterialValue.toFixed(2)}`}
          icon={Package}
          subtitle="Current stock value"
        />
        <StatCard
          title="Products Value"
          value={summaryLoading ? '...' : `$${summary?.totalProductValue.toFixed(2)}`}
          icon={ShoppingCart}
          subtitle="At selling price"
        />
        <StatCard
          title="Active Quotations"
          value={summaryLoading ? '...' : `$${summary?.totalQuotationsValue.toFixed(2)}`}
          icon={DollarSign}
          subtitle="Sent + accepted"
        />
        <StatCard
          title="Sales Orders"
          value={summaryLoading ? '...' : `$${summary?.totalSalesOrdersValue.toFixed(2)}`}
          icon={TrendingUp}
          subtitle="Total orders value"
        />
        <StatCard
          title="Pending Orders"
          value={summaryLoading ? '...' : `$${summary?.pendingOrdersValue.toFixed(2)}`}
          icon={Clock}
          subtitle="Awaiting fulfillment"
        />
      </div>
    </div>
  );
}
