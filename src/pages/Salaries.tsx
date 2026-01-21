import { useState } from 'react';
import { useSalaries, useJobCategories, useCreateSalary, useUpdateSalary, useDeleteSalary, useCreateJobCategory, useDeleteJobCategory } from '@/hooks/useSalaries';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Banknote, Plus, MoreHorizontal, Pencil, Trash2, Search, Shield, Briefcase, PlusCircle } from 'lucide-react';
import type { Salary, JobCategory, PaymentStatus } from '@/types/erp';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const initialFormData = {
  employee_id: '',
  employee_name: '',
  employee_number: '',
  work_location: '',
  job_category_id: '',
  base_salary: 0,
  housing_allowance: 0,
  transport_allowance: 0,
  other_allowances: 0,
  overtime_hours: 0,
  overtime_rate: 0,
  bonus: 0,
  tax_deduction: 0,
  other_deductions: 0,
  payment_date: '',
  payment_status: 'pending' as PaymentStatus,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  notes: '',
  amount_paid: 0,
};

export default function Salaries() {
  const { hasRole } = useAuth();
  const canAccess = hasRole('admin') || hasRole('hr') || hasRole('cfo');
  const canManage = hasRole('admin') || hasRole('hr');

  const { data: salaries = [], isLoading } = useSalaries();
  const { data: jobCategories = [] } = useJobCategories();
  const { data: users = [] } = useUsers();
  const createSalary = useCreateSalary();
  const updateSalary = useUpdateSalary();
  const deleteSalary = useDeleteSalary();
  const createJobCategory = useCreateJobCategory();
  const deleteJobCategory = useDeleteJobCategory();

  const [isOpen, setIsOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const activeUsers = users.filter(u => u.is_active !== false);

  const filteredSalaries = salaries.filter(
    (s) =>
      s.employee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employee_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSalary(null);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (salary: Salary) => {
    setEditingSalary(salary);
    setFormData({
      employee_id: salary.employee_id || '',
      employee_name: (salary as any).employee_name || salary.employee?.full_name || '',
      employee_number: salary.employee_number,
      work_location: salary.work_location || '',
      job_category_id: salary.job_category_id || '',
      base_salary: Number(salary.base_salary),
      housing_allowance: Number(salary.housing_allowance),
      transport_allowance: Number(salary.transport_allowance),
      other_allowances: Number(salary.other_allowances),
      overtime_hours: Number(salary.overtime_hours),
      overtime_rate: Number(salary.overtime_rate),
      bonus: Number(salary.bonus),
      tax_deduction: Number(salary.tax_deduction),
      other_deductions: Number(salary.other_deductions),
      payment_date: salary.payment_date || '',
      payment_status: salary.payment_status as PaymentStatus,
      month: salary.month,
      year: salary.year,
      notes: salary.notes || '',
      amount_paid: 0,
    });
    setIsOpen(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const result = await createJobCategory.mutateAsync({ name: newCategoryName.trim() });
    if (result?.id) {
      setFormData({ ...formData, job_category_id: result.id });
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      employee_id: formData.employee_id || undefined,
      employee_name: formData.employee_name || undefined,
      employee_number: formData.employee_number,
      work_location: formData.work_location || undefined,
      job_category_id: formData.job_category_id || undefined,
      base_salary: formData.base_salary,
      housing_allowance: formData.housing_allowance,
      transport_allowance: formData.transport_allowance,
      other_allowances: formData.other_allowances,
      overtime_hours: formData.overtime_hours,
      overtime_rate: formData.overtime_rate,
      bonus: formData.bonus,
      tax_deduction: formData.tax_deduction,
      other_deductions: formData.other_deductions,
      payment_date: formData.payment_date || undefined,
      payment_status: formData.payment_status,
      month: formData.month,
      year: formData.year,
      notes: formData.notes || undefined,
    };

    if (editingSalary) {
      await updateSalary.mutateAsync({ id: editingSalary.id, ...payload });
    } else {
      await createSalary.mutateAsync(payload);
    }
    
    handleOpenChange(false);
  };

  const calculateNetPay = () => {
    const gross = formData.base_salary + formData.housing_allowance + 
                  formData.transport_allowance + formData.other_allowances + 
                  (formData.overtime_hours * formData.overtime_rate) + formData.bonus;
    const deductions = formData.tax_deduction + formData.other_deductions;
    return gross - deductions;
  };

  const isSubmitting = createSalary.isPending || updateSalary.isPending;

  const statusColors: Record<PaymentStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const columns: Column<Salary & { employee: any; job_category: JobCategory | null }>[] = [
    {
      key: 'employee',
      header: 'Employee',
      cell: (item) => (
        <div>
          <p className="font-medium">{(item as any).employee_name || item.employee?.full_name || 'Unknown'}</p>
          <p className="text-sm text-muted-foreground">#{item.employee_number}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      cell: (item) => (
        <span>{MONTHS[item.month - 1]} {item.year}</span>
      ),
    },
    {
      key: 'job_category',
      header: 'Job Category',
      cell: (item) => (
        <span className="text-muted-foreground">{item.job_category?.name || '—'}</span>
      ),
    },
    {
      key: 'base_salary',
      header: 'Base Salary',
      cell: (item) => <span>${Number(item.base_salary).toLocaleString()}</span>,
    },
    {
      key: 'net_pay',
      header: 'Net Pay',
      cell: (item) => (
        <span className="font-medium text-primary">${Number(item.net_pay).toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <Badge className={statusColors[item.payment_status as PaymentStatus]}>
          {item.payment_status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteSalary.mutate(item.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null,
      className: 'w-12',
    },
  ];

  if (!canAccess) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Salaries & Payroll" description="Manage employee salaries and payroll." />
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You don't have permission to view this page. Only Admin, HR, and CFO can access salaries."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Tabs defaultValue="salaries">
        <PageHeader
          title="Salaries & Payroll"
          description="Manage employee salaries and payroll."
          actions={
            <div className="flex gap-2">
              <TabsList>
                <TabsTrigger value="salaries">Salaries</TabsTrigger>
                <TabsTrigger value="categories">Job Categories</TabsTrigger>
              </TabsList>
              {canManage && (
                <Button onClick={() => setIsOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Salary
                </Button>
              )}
            </div>
          }
        />

        <TabsContent value="salaries" className="mt-6">
          {/* Search */}
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {!isLoading && salaries.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No salary records yet"
              description="Add your first salary record to start managing payroll."
              action={canManage ? {
                label: 'Add Salary',
                onClick: () => setIsOpen(true),
              } : undefined}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filteredSalaries}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              emptyMessage="No salary records found."
            />
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="mb-6 flex justify-between items-center">
            <p className="text-muted-foreground">Manage job categories for salary classification.</p>
            {canManage && (
              <Button onClick={() => setIsCategoryDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            )}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteJobCategory.mutate(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {jobCategories.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No job categories yet. Add your first category.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Job Category</DialogTitle>
            <DialogDescription>Create a new job category for salary classification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Engineering, Sales, Marketing"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                await handleAddCategory();
                setIsCategoryDialogOpen(false);
              }}
              disabled={!newCategoryName.trim() || createJobCategory.isPending}
            >
              {createJobCategory.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Form Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingSalary ? 'Edit Salary Record' : 'Add Salary Record'}</DialogTitle>
              <DialogDescription>
                {editingSalary ? 'Update salary details.' : 'Create a new salary record for an employee.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Employee Selection */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Employee Name *</Label>
                  <Input
                    value={formData.employee_name}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value, employee_id: '' })}
                    placeholder="Enter employee name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link to User (Optional)</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => {
                      const user = activeUsers.find(u => u.id === value);
                      setFormData({ 
                        ...formData, 
                        employee_id: value,
                        employee_name: user?.full_name || formData.employee_name
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employee Number *</Label>
                  <Input
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    placeholder="EMP-001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Location</Label>
                  <Input
                    value={formData.work_location}
                    onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                    placeholder="Main Office"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job Category</Label>
                  {isAddingCategory ? (
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category"
                        autoFocus
                      />
                      <Button type="button" size="sm" onClick={handleAddCategory}>
                        Add
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingCategory(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value={formData.job_category_id}
                        onValueChange={(value) => setFormData({ ...formData, job_category_id: value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="icon" variant="outline" onClick={() => setIsAddingCategory(true)}>
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Period */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month *</Label>
                  <Select
                    value={String(formData.month)}
                    onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={index} value={String(index + 1)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>

              {/* Earnings */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Earnings</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Base Salary ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.base_salary}
                      onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Housing ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.housing_allowance}
                      onChange={(e) => setFormData({ ...formData, housing_allowance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transport ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.transport_allowance}
                      onChange={(e) => setFormData({ ...formData, transport_allowance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Allow. ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.other_allowances}
                      onChange={(e) => setFormData({ ...formData, other_allowances: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Overtime & Bonus */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Overtime Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.overtime_hours}
                    onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>OT Rate ($/hr)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.overtime_rate}
                    onChange={(e) => setFormData({ ...formData, overtime_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Deductions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax Deduction ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.tax_deduction}
                      onChange={(e) => setFormData({ ...formData, tax_deduction: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Deductions ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.other_deductions}
                      onChange={(e) => setFormData({ ...formData, other_deductions: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Net Pay Preview */}
              <div className="rounded-lg bg-primary/10 p-4">
                <p className="text-sm text-muted-foreground">Calculated Net Pay</p>
                <p className="text-2xl font-bold text-primary">${calculateNetPay().toLocaleString()}</p>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select
                    value={formData.payment_status}
                    onValueChange={(value: PaymentStatus) => setFormData({ ...formData, payment_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.employee_name || !formData.employee_number}>
                {isSubmitting ? (editingSalary ? 'Updating...' : 'Creating...') : (editingSalary ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
