import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardList } from 'lucide-react';

export default function BOM() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bill of Materials"
        description="Define product compositions and material requirements."
      />
      <EmptyState
        icon={ClipboardList}
        title="BOM module coming soon"
        description="Create bills of materials for your products, defining the raw materials and quantities needed."
      />
    </div>
  );
}
