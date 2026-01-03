import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

export default function Quotations() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quotations"
        description="Create and manage customer quotations."
      />
      <EmptyState
        icon={FileText}
        title="Quotations module coming soon"
        description="Create quotations for customers, track validity periods, and convert to sales orders."
      />
    </div>
  );
}
