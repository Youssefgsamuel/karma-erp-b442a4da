import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Salary, JobCategory, PaymentStatus } from '@/types/erp';
import { useToast } from '@/hooks/use-toast';

export function useSalaries() {
  return useQuery({
    queryKey: ['salaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salaries')
        .select(`
          *,
          employee:profiles(*),
          job_category:job_categories(*)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) throw error;
      return data as (Salary & { employee: any; job_category: JobCategory | null })[];
    },
  });
}

export function useJobCategories() {
  return useQuery({
    queryKey: ['job-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as JobCategory[];
    },
  });
}

export function useCreateJobCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('job_categories')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as JobCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-categories'] });
      toast({
        title: 'Job Category Created',
        description: 'The job category has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useDeleteJobCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-categories'] });
      toast({
        title: 'Job Category Deleted',
        description: 'The job category has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

interface CreateSalaryInput {
  employee_id: string;
  employee_number: string;
  work_location?: string;
  job_category_id?: string;
  base_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  overtime_hours: number;
  overtime_rate: number;
  bonus: number;
  tax_deduction: number;
  other_deductions: number;
  payment_date?: string;
  payment_status: PaymentStatus;
  month: number;
  year: number;
  notes?: string;
}

export function useCreateSalary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSalaryInput) => {
      const { data, error } = await supabase
        .from('salaries')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      toast({
        title: 'Salary Record Created',
        description: 'The salary record has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useUpdateSalary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateSalaryInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('salaries')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      toast({
        title: 'Salary Record Updated',
        description: 'The salary record has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useDeleteSalary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salaries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      toast({
        title: 'Salary Record Deleted',
        description: 'The salary record has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}
