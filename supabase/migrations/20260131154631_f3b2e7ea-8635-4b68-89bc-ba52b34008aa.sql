-- Add assigned_quantity to products (numeric field instead of text assigned_to)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS assigned_quantity numeric NOT NULL DEFAULT 0;

-- Create table to track product assignments linked to quotations/MOs
CREATE TABLE IF NOT EXISTS public.product_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  mo_id uuid REFERENCES public.manufacturing_orders(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_production', 'completed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on product_assignments
ALTER TABLE public.product_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_assignments
CREATE POLICY "All authenticated can view product assignments" 
ON public.product_assignments FOR SELECT USING (true);

CREATE POLICY "Admin and inventory managers can manage product assignments" 
ON public.product_assignments FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role) OR has_role(auth.uid(), 'manufacture_manager'::app_role));

-- Create quotation edit history table
CREATE TABLE IF NOT EXISTS public.quotation_edit_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changes jsonb NOT NULL,
  previous_values jsonb NOT NULL,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on quotation_edit_history
ALTER TABLE public.quotation_edit_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotation_edit_history
CREATE POLICY "All authenticated can view quotation edit history" 
ON public.quotation_edit_history FOR SELECT USING (true);

CREATE POLICY "Admin and purchasing can manage quotation edit history" 
ON public.quotation_edit_history FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role));

-- Add edit_count to quotations for quick "edited" indicator
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;

-- Add quotation_id to manufacturing_orders for tracking origin
-- (already exists: sales_order_id, but let's add direct quotation link)
ALTER TABLE public.manufacturing_orders ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL;

-- Create triggers for updated_at
CREATE TRIGGER update_product_assignments_updated_at
BEFORE UPDATE ON public.product_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();