import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description="Configure system settings and preferences."
      />
      <EmptyState
        icon={Settings}
        title="Settings coming soon"
        description="Configure working hours, manufacturing parameters, email notifications, and more."
      />
    </div>
  );
}
