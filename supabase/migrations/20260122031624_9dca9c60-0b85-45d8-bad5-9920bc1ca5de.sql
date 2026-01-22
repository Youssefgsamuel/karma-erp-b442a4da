-- Add payment_terms_notes column to suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS payment_terms_notes text;

-- Add semi_finished and hybrid to product_type enum
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'semi_finished';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'hybrid';

-- Create product_materials table for hybrid products with multiple material lines
CREATE TABLE IF NOT EXISTS public.product_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 1,
  source_type text NOT NULL DEFAULT 'in_house' CHECK (source_type IN ('in_house', 'outsourced')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on product_materials
ALTER TABLE public.product_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_materials
CREATE POLICY "All authenticated can view product materials"
ON public.product_materials FOR SELECT
USING (true);

CREATE POLICY "Admins and inventory managers can manage product materials"
ON public.product_materials FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

-- Create notifications table for shortage alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read boolean NOT NULL DEFAULT false,
  reference_type text,
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);