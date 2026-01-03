-- Fix profiles table: restrict SELECT to own profile or admin/hr roles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own profile by default
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins and HR can view all profiles
CREATE POLICY "Admins and HR can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

-- Fix suppliers table: restrict SELECT to admin/purchasing roles
DROP POLICY IF EXISTS "All authenticated can view suppliers" ON public.suppliers;

-- Only admin and purchasing can view suppliers
CREATE POLICY "Admin and purchasing can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'purchasing'));