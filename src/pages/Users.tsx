import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="User Management"
        description="Manage users, roles, and permissions."
      />
      <EmptyState
        icon={Users}
        title="User management coming soon"
        description="Invite team members, assign roles, and manage access permissions."
      />
    </div>
  );
}
