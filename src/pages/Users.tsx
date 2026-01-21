import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUserRoles, useDeactivateUser, useReactivateUser, UserWithRoles } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Plus, MoreHorizontal, Shield, Search, UserCog, UserX, UserCheck } from 'lucide-react';
import type { AppRole } from '@/types/erp';

const ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin/CEO', description: 'Full system access' },
  { value: 'hr', label: 'HR', description: 'Manage employees and salaries' },
  { value: 'manufacture_manager', label: 'Manufacturing Manager', description: 'Manage production and MOs' },
  { value: 'inventory_manager', label: 'Inventory Manager', description: 'Manage stock and materials' },
  { value: 'purchasing', label: 'Purchasing', description: 'Handle purchase orders' },
  { value: 'cfo', label: 'CFO', description: 'Financial oversight' },
];

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  hr: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  manufacture_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  inventory_manager: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  purchasing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  cfo: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateRoles = useUpdateUserRoles();
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();

  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    roles: [] as AppRole[],
  });

  // Filter out deactivated users and apply search
  const activeUsers = users.filter((u) => u.is_active !== false);
  const filteredUsers = activeUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser.mutateAsync({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      phone: formData.phone || undefined,
      roles: formData.roles,
    });
    setIsOpen(false);
    setFormData({ email: '', password: '', fullName: '', phone: '', roles: [] });
  };

  const handleRoleToggle = (role: AppRole) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleEditRoles = async (user: UserWithRoles, newRoles: AppRole[]) => {
    await updateRoles.mutateAsync({ userId: user.user_id, roles: newRoles });
    setEditingUser(null);
  };

  const columns: Column<UserWithRoles>[] = [
    {
      key: 'name',
      header: 'User',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium">{item.full_name}</p>
            <p className="text-sm text-muted-foreground">{item.email}</p>
          </div>
          {item.is_active === false && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Inactive
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (item) => <span className="text-muted-foreground">{item.phone || '—'}</span>,
    },
    {
      key: 'roles',
      header: 'Roles',
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.roles.length === 0 ? (
            <span className="text-muted-foreground text-sm">No roles</span>
          ) : (
            item.roles.map((role) => (
              <Badge key={role} className={roleColors[role]} variant="secondary">
                {ROLES.find((r) => r.value === role)?.label || role}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (item) => (
        <span className="text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingUser(item)}>
              <UserCog className="mr-2 h-4 w-4" />
              Manage Roles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {item.is_active !== false ? (
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => deactivateUser.mutate(item.user_id)}
              >
                <UserX className="mr-2 h-4 w-4" />
                Deactivate User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={() => reactivateUser.mutate(item.user_id)}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Reactivate User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-12',
    },
  ];

  if (!isAdmin) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="User Management" description="Manage users, roles, and permissions." />
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You don't have permission to view this page. Only administrators can manage users."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="User Management"
        description="Manage users, roles, and permissions."
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system with specific roles.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Roles</Label>
                    <div className="grid gap-2">
                      {ROLES.map((role) => (
                        <div
                          key={role.value}
                          className="flex items-center space-x-3 rounded-lg border p-3"
                        >
                          <Checkbox
                            id={role.value}
                            checked={formData.roles.includes(role.value)}
                            onCheckedChange={() => handleRoleToggle(role.value)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={role.value} className="cursor-pointer font-medium">
                              {role.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Edit Roles Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              Update roles for {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <EditRolesForm
            user={editingUser}
            onSave={(roles) => editingUser && handleEditRoles(editingUser, roles)}
            onCancel={() => setEditingUser(null)}
            isLoading={updateRoles.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {!isLoading && users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Add users to your system and assign them roles."
          action={{
            label: 'Add User',
            onClick: () => setIsOpen(true),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyMessage="No users found matching your search."
        />
      )}
    </div>
  );
}

function EditRolesForm({
  user,
  onSave,
  onCancel,
  isLoading,
}: {
  user: UserWithRoles | null;
  onSave: (roles: AppRole[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(user?.roles || []);

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {ROLES.map((role) => (
          <div key={role.value} className="flex items-center space-x-3 rounded-lg border p-3">
            <Checkbox
              id={`edit-${role.value}`}
              checked={selectedRoles.includes(role.value)}
              onCheckedChange={() => handleRoleToggle(role.value)}
            />
            <div className="flex-1">
              <Label htmlFor={`edit-${role.value}`} className="cursor-pointer font-medium">
                {role.label}
              </Label>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(selectedRoles)} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Roles'}
        </Button>
      </DialogFooter>
    </div>
  );
}
