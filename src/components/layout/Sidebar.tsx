import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  Factory,
  Truck,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Products', href: '/products', icon: Package },
  { title: 'Raw Materials', href: '/raw-materials', icon: Boxes },
  { title: 'Inventory', href: '/inventory', icon: Warehouse },
  { title: 'BOM', href: '/bom', icon: ClipboardList },
  { title: 'Manufacturing', href: '/manufacturing', icon: Factory, roles: ['admin', 'manufacture_manager'] },
  { title: 'Suppliers', href: '/suppliers', icon: Truck, roles: ['admin', 'purchasing', 'inventory_manager'] },
  { title: 'Quotations', href: '/quotations', icon: FileText, roles: ['admin', 'cfo'] },
  { title: 'Finance', href: '/finance', icon: DollarSign, roles: ['admin', 'cfo'] },
  { title: 'Users', href: '/users', icon: Users, roles: ['admin', 'hr'] },
  { title: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, roles, signOut, hasRole } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(role => hasRole(role as any));
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Factory className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">ManufactERP</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          const linkContent = (
            <Link
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="bg-card text-card-foreground">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-2">
        {!collapsed && profile && (
          <div className="mb-2 rounded-lg bg-sidebar-accent p-3">
            <p className="text-sm font-medium text-sidebar-accent-foreground">
              {profile.full_name}
            </p>
            <p className="text-xs text-sidebar-foreground/70">{profile.email}</p>
            {roles.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {roles.slice(0, 2).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-xs font-medium text-sidebar-primary"
                  >
                    {role.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
