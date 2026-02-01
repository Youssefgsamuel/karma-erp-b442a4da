-- Create semi_finished_goods table to track items with missing components
CREATE TABLE public.semi_finished_goods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  mo_id UUID REFERENCES public.manufacturing_orders(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  missing_items TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.semi_finished_goods ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "All authenticated can view semi-finished goods"
  ON public.semi_finished_goods
  FOR SELECT
  USING (true);

CREATE POLICY "Inventory and manufacture managers can manage semi-finished goods"
  ON public.semi_finished_goods
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role) OR has_role(auth.uid(), 'manufacture_manager'::app_role));