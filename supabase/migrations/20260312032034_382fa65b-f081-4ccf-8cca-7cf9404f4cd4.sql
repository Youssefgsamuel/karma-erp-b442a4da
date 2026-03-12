
-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id),
  status text NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view POs" ON public.purchase_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and purchasing can manage POs" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role));

-- Purchase Order Items table
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  raw_material_id uuid REFERENCES public.raw_materials(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view PO items" ON public.purchase_order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and purchasing can manage PO items" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role));

-- Customer Interactions table
CREATE TABLE public.customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  interaction_type text NOT NULL DEFAULT 'note',
  subject text,
  notes text,
  contact_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and purchasing can view interactions" ON public.customer_interactions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role));

CREATE POLICY "Admin and purchasing can manage interactions" ON public.customer_interactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'purchasing'::app_role));

-- Add updated_at trigger for purchase_orders
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Allow sales roles to view customers (needed for CRM)
CREATE POLICY "Sales can view customers" ON public.customers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sales_cairo'::app_role) OR has_role(auth.uid(), 'sales_north_coast'::app_role));
