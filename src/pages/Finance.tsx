import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DollarSign } from 'lucide-react';

export default function Finance() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Finance"
        description="Track revenues, costs, and profitability."
      />
      <EmptyState
        icon={DollarSign}
        title="Finance module coming soon"
        description="View financial reports, track costs and revenues, and analyze profitability across products."
      />
    </div>
  );
}
