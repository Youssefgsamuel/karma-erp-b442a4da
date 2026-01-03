import { useProducts } from '@/hooks/useProducts';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, Package, Boxes, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import type { Product, RawMaterial } from '@/types/erp';

export default function Inventory() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: materials = [], isLoading: materialsLoading } = useRawMaterials();

  const isLoading = productsLoading || materialsLoading;

  const productValue = products.reduce(
    (sum, p) => sum + Number(p.current_stock) * Number(p.selling_price),
    0
  );
  const materialValue = materials.reduce(
    (sum, m) => sum + Number(m.current_stock) * Number(m.cost_per_unit),
    0
  );
  const totalValue = productValue + materialValue;

  const lowStockProducts = products.filter((p) => p.current_stock <= p.minimum_stock);
  const lowStockMaterials = materials.filter((m) => m.current_stock <= m.minimum_stock);

  const productColumns: Column<Product>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (item) => <span className="font-mono text-sm">{item.sku}</span>,
    },
    {
      key: 'name',
      header: 'Product',
      cell: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (item) => (
        <Badge variant={item.product_type === 'in_house' ? 'default' : 'secondary'}>
          {item.product_type === 'in_house' ? 'In-House' : 'Outsourced'}
        </Badge>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (item) => {
        const isLow = item.current_stock <= item.minimum_stock;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-medium text-destructive' : ''}>
              {item.current_stock} {item.unit}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        );
      },
    },
    {
      key: 'min',
      header: 'Min Level',
      cell: (item) => <span className="text-muted-foreground">{item.minimum_stock}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      cell: (item) => (
        <span className="font-medium">
          ${(Number(item.current_stock) * Number(item.selling_price)).toFixed(2)}
        </span>
      ),
    },
  ];

  const materialColumns: Column<RawMaterial>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (item) => <span className="font-mono text-sm">{item.sku}</span>,
    },
    {
      key: 'name',
      header: 'Material',
      cell: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      cell: (item) => <Badge variant="outline">{item.unit}</Badge>,
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (item) => {
        const isLow = item.current_stock <= item.minimum_stock;
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-medium text-destructive' : ''}>
              {item.current_stock}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        );
      },
    },
    {
      key: 'min',
      header: 'Min Level',
      cell: (item) => <span className="text-muted-foreground">{item.minimum_stock}</span>,
    },
    {
      key: 'reorder',
      header: 'Reorder Point',
      cell: (item) => <span className="text-muted-foreground">{item.reorder_point}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      cell: (item) => (
        <span className="font-medium">
          ${(Number(item.current_stock) * Number(item.cost_per_unit)).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        description="Overview of your stock levels and inventory value."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inventory Value
            </CardTitle>
            <Warehouse className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Product Stock Value
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${productValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{products.length} products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Materials Value
            </CardTitle>
            <Boxes className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${materialValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{materials.length} materials</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {lowStockProducts.length + lowStockMaterials.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {lowStockProducts.length} products, {lowStockMaterials.length} materials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Tables */}
      <Tabs defaultValue="products" className="mt-8">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Finished Goods ({products.length})
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Boxes className="h-4 w-4" />
            Raw Materials ({materials.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <DataTable
            columns={productColumns}
            data={products}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="No finished goods in inventory."
          />
        </TabsContent>
        <TabsContent value="materials" className="mt-4">
          <DataTable
            columns={materialColumns}
            data={materials}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="No raw materials in inventory."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
