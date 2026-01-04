import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Package, ShoppingCart, TrendingUp, Warehouse, Clock } from 'lucide-react';
import { useFinanceSummary, useInventoryTransactions } from '@/hooks/useFinance';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number | null;
  created_at: string;
  notes: string | null;
  raw_material?: { name: string } | null;
  product?: { name: string } | null;
}

const transactionTypeColors: Record<string, string> = {
  purchase: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  consumption: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  adjustment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  production: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sale: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function Finance() {
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary();
  const { data: transactions = [], isLoading: txLoading } = useInventoryTransactions();

  const columns: Column<Transaction>[] = [
    { 
      key: 'created_at', 
      header: 'Date', 
      cell: (tx) => format(new Date(tx.created_at), 'MMM d, yyyy HH:mm') 
    },
    { 
      key: 'type', 
      header: 'Type', 
      cell: (tx) => (
        <Badge className={transactionTypeColors[tx.transaction_type] || 'bg-muted'}>
          {tx.transaction_type}
        </Badge>
      )
    },
    { 
      key: 'item', 
      header: 'Item', 
      cell: (tx) => tx.raw_material?.name || tx.product?.name || '-' 
    },
    { key: 'quantity', header: 'Quantity', cell: (tx) => tx.quantity },
    { 
      key: 'unit_cost', 
      header: 'Unit Cost', 
      cell: (tx) => tx.unit_cost ? `$${Number(tx.unit_cost).toFixed(2)}` : '-' 
    },
    { 
      key: 'total', 
      header: 'Total', 
      cell: (tx) => tx.unit_cost ? `$${(Number(tx.quantity) * Number(tx.unit_cost)).toFixed(2)}` : '-' 
    },
    { key: 'notes', header: 'Notes', cell: (tx) => tx.notes || '-' },
  ];

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

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inventory Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transactions as Transaction[]}
            keyExtractor={(tx) => tx.id}
            isLoading={txLoading}
            emptyMessage="No inventory transactions recorded yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
