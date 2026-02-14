import { useProducts } from '@/hooks/useProducts';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Boxes, 
  AlertTriangle, 
  TrendingUp,
  Factory,
  Truck,
  ClipboardList,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: rawMaterials = [], isLoading: materialsLoading } = useRawMaterials();

  const activeProducts = products.filter(p => p.is_active).length;
  const lowStockProducts = products.filter(p => p.current_stock <= p.minimum_stock).length;
  const lowStockMaterials = rawMaterials.filter(m => m.current_stock <= m.reorder_point);
  const totalInventoryValue = rawMaterials.reduce((sum, m) => sum + (m.current_stock * m.cost_per_unit), 0);

  const stockAlerts = [
    ...rawMaterials
      .filter(m => m.current_stock <= m.reorder_point)
      .map(m => ({
        id: m.id,
        name: m.name,
        sku: m.sku,
        current: m.current_stock,
        minimum: m.reorder_point,
        type: 'material' as const,
      })),
    ...products
      .filter(p => p.current_stock <= p.minimum_stock)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        current: p.current_stock,
        minimum: p.minimum_stock,
        type: 'product' as const,
      })),
  ].slice(0, 5);

  const isLoading = productsLoading || materialsLoading;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'User'}`}
        description="Here's what's happening with your manufacturing operations today."
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={isLoading ? '...' : activeProducts}
          subtitle={`${products.length} total, ${activeProducts} active`}
          icon={Package}
          variant="primary"
        />
        <StatCard
          title="Raw Materials"
          value={isLoading ? '...' : rawMaterials.length}
          subtitle={`${lowStockMaterials.length} low stock`}
          icon={Boxes}
          variant={lowStockMaterials.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Stock Alerts"
          value={isLoading ? '...' : lowStockProducts + lowStockMaterials.length}
          subtitle="Items need attention"
          icon={AlertTriangle}
          variant={lowStockProducts + lowStockMaterials.length > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Inventory Value"
          value={isLoading ? '...' : `$${totalInventoryValue.toLocaleString()}`}
          subtitle="Raw materials total"
          icon={DollarSign}
          variant="default"
        />
      </div>

      {/* Main Content Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold">Stock Alerts</CardTitle>
            <AlertTriangle className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            {stockAlerts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                All stock levels are healthy! 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {stockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-warning/10 p-2">
                        {alert.type === 'material' ? (
                          <Boxes className="h-4 w-4 text-warning" />
                        ) : (
                          <Package className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{alert.name}</p>
                        <p className="text-xs text-muted-foreground">{alert.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="erp-badge-warning">
                        {alert.current} / {alert.minimum}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Package, label: 'Add Product', href: '/products' },
                { icon: Boxes, label: 'Add Material', href: '/raw-materials' },
                { icon: Factory, label: 'New MO', href: '/manufacturing' },
                { icon: ClipboardList, label: 'Create BOM', href: '/bom' },
                { icon: Truck, label: 'Add Supplier', href: '/suppliers' },
                { icon: TrendingUp, label: 'View Reports', href: '/finance' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.href)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted text-left"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">In-House Products</p>
              <p className="mt-1 text-2xl font-bold">
                {products.filter(p => p.product_type === 'in_house').length}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Outsourced Products</p>
              <p className="mt-1 text-2xl font-bold">
                {products.filter(p => p.product_type === 'outsourced').length}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Avg. Manufacturing Time</p>
              <p className="mt-1 text-2xl font-bold">
                {products.length > 0
                  ? Math.round(
                      products.reduce((sum, p) => sum + p.manufacturing_time_minutes, 0) /
                        products.length
                    )
                  : 0}{' '}
                min
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="mt-1 text-2xl font-bold">
                {new Set(products.map(p => p.category_id).filter(Boolean)).size}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
