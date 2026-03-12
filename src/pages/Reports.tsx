import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, DollarSign, Package, Factory } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

function useReportData() {
  return useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      const [salesRes, productsRes, materialsRes, mosRes] = await Promise.all([
        supabase.from('sales_orders').select('*').is('deleted_at', null),
        supabase.from('products').select('*').is('deleted_at', null),
        supabase.from('raw_materials').select('*').is('deleted_at', null),
        supabase.from('manufacturing_orders').select('*').is('deleted_at', null),
      ]);

      return {
        sales: salesRes.data || [],
        products: productsRes.data || [],
        materials: materialsRes.data || [],
        mos: mosRes.data || [],
      };
    },
  });
}

function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export default function ReportsPage() {
  const { data, isLoading } = useReportData();

  const salesByMonth = useMemo(() => {
    if (!data) return [];
    const months: Record<string, { month: string; revenue: number; orders: number }> = {};
    data.sales.forEach((s: any) => {
      const key = format(new Date(s.order_date), 'yyyy-MM');
      const label = format(new Date(s.order_date), 'MMM yyyy');
      if (!months[key]) months[key] = { month: label, revenue: 0, orders: 0 };
      if (s.status !== 'cancelled') {
        months[key].revenue += Number(s.total);
        months[key].orders += 1;
      }
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [data]);

  const revenueByCustomer = useMemo(() => {
    if (!data) return [];
    const customers: Record<string, { name: string; revenue: number; orders: number }> = {};
    data.sales.forEach((s: any) => {
      if (s.status === 'cancelled') return;
      if (!customers[s.customer_name]) customers[s.customer_name] = { name: s.customer_name, revenue: 0, orders: 0 };
      customers[s.customer_name].revenue += Number(s.total);
      customers[s.customer_name].orders += 1;
    });
    return Object.values(customers).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  const profitMargins = useMemo(() => {
    if (!data) return [];
    return data.products.map((p: any) => ({
      name: p.name,
      sku: p.sku,
      selling_price: Number(p.selling_price),
      cost_price: Number(p.cost_price),
      margin: p.selling_price > 0 ? ((Number(p.selling_price) - Number(p.cost_price)) / Number(p.selling_price) * 100) : 0,
      stock: Number(p.current_stock),
      stock_value: Number(p.current_stock) * Number(p.selling_price),
    })).sort((a: any, b: any) => b.margin - a.margin);
  }, [data]);

  const inventoryTurnover = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p: any) => p.current_stock > 0).map((p: any) => {
      const soldQty = data.sales
        .filter((s: any) => s.status !== 'cancelled')
        .length; // simplified
      return {
        name: p.name,
        sku: p.sku,
        stock: Number(p.current_stock),
        min_stock: Number(p.minimum_stock),
        value: Number(p.current_stock) * Number(p.cost_price),
        days_of_stock: p.minimum_stock > 0 ? Math.round(Number(p.current_stock) / Number(p.minimum_stock) * 30) : 0,
      };
    }).sort((a: any, b: any) => a.days_of_stock - b.days_of_stock);
  }, [data]);

  const moStats = useMemo(() => {
    if (!data) return { total: 0, completed: 0, inProgress: 0, planned: 0 };
    return {
      total: data.mos.length,
      completed: data.mos.filter((m: any) => m.status === 'completed' || m.status === 'closed').length,
      inProgress: data.mos.filter((m: any) => m.status === 'in_progress').length,
      planned: data.mos.filter((m: any) => m.status === 'planned').length,
    };
  }, [data]);

  const salesColumns: Column<any>[] = [
    { key: 'name', header: 'Customer', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'orders', header: 'Orders', cell: (r) => formatNumber(r.orders) },
    { key: 'revenue', header: 'Revenue', cell: (r) => <span className="font-medium">{formatCurrency(r.revenue)}</span> },
    { key: 'avg', header: 'Avg Order', cell: (r) => formatCurrency(r.orders > 0 ? r.revenue / r.orders : 0) },
  ];

  const marginColumns: Column<any>[] = [
    { key: 'name', header: 'Product', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'sku', header: 'SKU', cell: (r) => <span className="font-mono text-sm">{r.sku}</span> },
    { key: 'selling', header: 'Selling Price', cell: (r) => formatCurrency(r.selling_price) },
    { key: 'cost', header: 'Cost Price', cell: (r) => formatCurrency(r.cost_price) },
    { key: 'margin', header: 'Margin %', cell: (r) => (
      <span className={r.margin >= 30 ? 'text-green-600 font-medium' : r.margin >= 15 ? 'text-yellow-600' : 'text-destructive font-medium'}>
        {r.margin.toFixed(1)}%
      </span>
    )},
    { key: 'stock_value', header: 'Stock Value', cell: (r) => formatCurrency(r.stock_value) },
  ];

  const turnoverColumns: Column<any>[] = [
    { key: 'name', header: 'Product', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'sku', header: 'SKU', cell: (r) => <span className="font-mono text-sm">{r.sku}</span> },
    { key: 'stock', header: 'Current Stock', cell: (r) => formatNumber(r.stock) },
    { key: 'min', header: 'Min Level', cell: (r) => formatNumber(r.min_stock) },
    { key: 'value', header: 'Value', cell: (r) => formatCurrency(r.value) },
    { key: 'days', header: 'Est. Days of Stock', cell: (r) => (
      <span className={r.days_of_stock < 30 ? 'text-destructive font-medium' : ''}>{r.days_of_stock}</span>
    )},
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reports" description="Sales, manufacturing, and inventory analytics." />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.sales.filter((s: any) => s.status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.total), 0) || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.sales.length || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MOs Completed</CardTitle>
            <Factory className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{moStats.completed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products in Stock</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data?.products.filter((p: any) => p.current_stock > 0).length || 0}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="margins">Profit Margins</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Turnover</TabsTrigger>
          <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(revenueByCustomer, 'sales-report')}>
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
          {salesByMonth.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          <DataTable columns={salesColumns} data={revenueByCustomer} keyExtractor={(r) => r.name} isLoading={isLoading} emptyMessage="No sales data." />
        </TabsContent>

        <TabsContent value="margins" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(profitMargins, 'profit-margins')}>
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
          <DataTable columns={marginColumns} data={profitMargins} keyExtractor={(r) => r.sku} isLoading={isLoading} emptyMessage="No products." />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(inventoryTurnover, 'inventory-turnover')}>
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
          <DataTable columns={turnoverColumns} data={inventoryTurnover} keyExtractor={(r) => r.sku} isLoading={isLoading} emptyMessage="No inventory data." />
        </TabsContent>

        <TabsContent value="manufacturing" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(
              data?.mos.map((m: any) => ({ mo_number: m.mo_number, status: m.status, priority: m.priority, quantity: m.quantity, planned_start: m.planned_start, planned_end: m.planned_end })) || [],
              'manufacturing-report'
            )}>
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{moStats.total}</p>
                <p className="text-sm text-muted-foreground">Total MOs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{moStats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{moStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>
          {data && data.mos.length > 0 && (
            <Card>
              <CardHeader><CardTitle>MO Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Planned', value: moStats.planned },
                        { name: 'In Progress', value: moStats.inProgress },
                        { name: 'Completed', value: moStats.completed },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" outerRadius={100} dataKey="value" label
                    >
                      {CHART_COLORS.map((color, i) => (<Cell key={i} fill={color} />))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
