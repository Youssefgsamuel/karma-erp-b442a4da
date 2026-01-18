-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "All authenticated can view customers" ON public.customers;

-- Create restricted SELECT policy for admin and purchasing only
CREATE POLICY "Admin and purchasing can view customers" 
ON public.customers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role));