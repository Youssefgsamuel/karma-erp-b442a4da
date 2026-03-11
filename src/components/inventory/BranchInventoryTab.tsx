import { useBranchInventory, type Branch } from '@/hooks/useBranchInventory';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Package } from 'lucide-react';

interface BranchInventoryTabProps {
  branch: Branch;
}

export function BranchInventoryTab({ branch }: BranchInventoryTabProps) {
  const { data: items = [], isLoading } = useBranchInventory(branch);
  const branchLabel = branch === 'cairo' ? 'Cairo' : 'North Coast';

  const totalValue = items.reduce(
    (sum, item) => sum + (item.quantity * (item.product?.selling_price || 0)),
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const columns: Column<typeof items[0]>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (item) => <span className="font-mono text-sm">{item.product?.sku || '-'}</span>,
    },
    {
      key: 'name',
      header: 'Product',
      cell: (item) => <span className="font-medium">{item.product?.name || 'Unknown'}</span>,
    },
    {
      key: 'quantity',
      header: 'Stock',
      cell: (item) => (
        <span className="font-medium">
          {formatNumber(item.quantity)} {item.product?.unit || 'pcs'}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      cell: (item) => (
        <span className="font-medium">
          {formatCurrency(item.quantity * (item.product?.selling_price || 0))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {branchLabel} Products
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Units
            </CardTitle>
            <MapPin className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalItems)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage={`No products in ${branchLabel} inventory yet. Dispatch products from Main Inventory.`}
      />
    </div>
  );
}
