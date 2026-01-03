import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Factory } from 'lucide-react';

export default function Manufacturing() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Manufacturing Orders"
        description="Manage production orders and track manufacturing progress."
      />
      <EmptyState
        icon={Factory}
        title="Manufacturing module coming soon"
        description="Create and track manufacturing orders, plan production schedules, and manage work orders."
      />
    </div>
  );
}
