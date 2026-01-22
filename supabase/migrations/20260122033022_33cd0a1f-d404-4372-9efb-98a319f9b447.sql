-- Create quality control records table
CREATE TABLE public.quality_control_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mo_id UUID NOT NULL REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'accepted', 'rejected')),
  inspector_id UUID REFERENCES public.profiles(id),
  inspected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quality_control_records ENABLE ROW LEVEL SECURITY;

-- All authenticated can view QC records
CREATE POLICY "All authenticated can view QC records"
ON public.quality_control_records
FOR SELECT
USING (true);

-- Admin and manufacture manager can manage QC records
CREATE POLICY "Admin and manufacture manager can manage QC records"
ON public.quality_control_records
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manufacture_manager'));

-- Create trigger for updated_at
CREATE TRIGGER update_quality_control_records_updated_at
BEFORE UPDATE ON public.quality_control_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();