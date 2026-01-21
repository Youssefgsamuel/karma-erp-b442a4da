-- Add customer_phone to quotations table
ALTER TABLE public.quotations ADD COLUMN customer_phone TEXT;

-- Make employee_id nullable in salaries table (for non-user employees)
ALTER TABLE public.salaries ALTER COLUMN employee_id DROP NOT NULL;

-- Add employee_name to salaries table (for non-user employees)
ALTER TABLE public.salaries ADD COLUMN employee_name TEXT;