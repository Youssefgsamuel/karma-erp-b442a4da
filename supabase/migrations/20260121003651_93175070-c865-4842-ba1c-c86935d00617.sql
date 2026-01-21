-- 1. Add supplier_id to raw_materials table
ALTER TABLE public.raw_materials 
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

-- 2. Add cost_price to products table for profit calculation
ALTER TABLE public.products 
ADD COLUMN cost_price numeric NOT NULL DEFAULT 0;

-- 3. Add is_active to profiles for soft delete
ALTER TABLE public.profiles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- 4. Create job_categories table for salary module
CREATE TABLE public.job_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view job categories" 
ON public.job_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin and HR can manage job categories" 
ON public.job_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- 5. Create salaries table with full payroll fields
CREATE TABLE public.salaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_number text NOT NULL,
  work_location text,
  job_category_id uuid REFERENCES public.job_categories(id),
  base_salary numeric NOT NULL DEFAULT 0,
  housing_allowance numeric NOT NULL DEFAULT 0,
  transport_allowance numeric NOT NULL DEFAULT 0,
  other_allowances numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_rate numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  tax_deduction numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric GENERATED ALWAYS AS (
    base_salary + housing_allowance + transport_allowance + other_allowances + 
    (overtime_hours * overtime_rate) + bonus - tax_deduction - other_deductions
  ) STORED,
  payment_date date,
  payment_status text NOT NULL DEFAULT 'pending',
  month integer NOT NULL,
  year integer NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

-- RLS: Only Admin, HR, and CFO can access salaries
CREATE POLICY "Admin HR CFO can view salaries" 
ON public.salaries 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role) OR 
  has_role(auth.uid(), 'cfo'::app_role)
);

CREATE POLICY "Admin and HR can manage salaries" 
ON public.salaries 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- Add trigger for updated_at on salaries
CREATE TRIGGER update_salaries_updated_at
BEFORE UPDATE ON public.salaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_raw_materials_supplier ON public.raw_materials(supplier_id);
CREATE INDEX idx_salaries_employee ON public.salaries(employee_id);
CREATE INDEX idx_salaries_month_year ON public.salaries(year, month);