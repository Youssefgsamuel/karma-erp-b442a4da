-- 1. Add "assigned_to" column for products (Inventory Assigned)
ALTER TABLE public.products ADD COLUMN assigned_to TEXT DEFAULT NULL;

-- 2. Add "is_for_sale" flag for raw materials
ALTER TABLE public.raw_materials ADD COLUMN is_for_sale BOOLEAN NOT NULL DEFAULT false;

-- 3. Rename "minimum_stock" to "purchasing_quantity" for raw materials
ALTER TABLE public.raw_materials RENAME COLUMN minimum_stock TO purchasing_quantity;

-- 4. Create raw material categories table
CREATE TABLE public.raw_material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on raw_material_categories
ALTER TABLE public.raw_material_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for raw_material_categories
CREATE POLICY "Admins can manage raw material categories"
  ON public.raw_material_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'inventory_manager'));

CREATE POLICY "All authenticated can view raw material categories"
  ON public.raw_material_categories
  FOR SELECT
  USING (true);

-- Add category_id to raw_materials
ALTER TABLE public.raw_materials ADD COLUMN category_id UUID REFERENCES public.raw_material_categories(id);

-- 5. Create MO items table for multi-item MOs
CREATE TABLE public.mo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mo_id UUID NOT NULL REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on mo_items
ALTER TABLE public.mo_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mo_items
CREATE POLICY "Admin and manufacture manager can manage MO items"
  ON public.mo_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manufacture_manager'));

CREATE POLICY "All authenticated can view MO items"
  ON public.mo_items
  FOR SELECT
  USING (true);

-- Add trigger for mo_items updated_at
CREATE TRIGGER update_mo_items_updated_at
  BEFORE UPDATE ON public.mo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();