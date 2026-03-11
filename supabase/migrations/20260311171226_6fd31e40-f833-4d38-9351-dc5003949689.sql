
-- Add transfer type to inventory_transaction_type enum
ALTER TYPE public.inventory_transaction_type ADD VALUE IF NOT EXISTS 'transfer';

-- Create branch_inventory table to track stock per branch
CREATE TABLE public.branch_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch text NOT NULL CHECK (branch IN ('cairo', 'north_coast')),
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, branch)
);

-- Enable RLS
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;

-- All authenticated can view branch inventory
CREATE POLICY "All authenticated can view branch inventory"
  ON public.branch_inventory FOR SELECT
  TO authenticated
  USING (true);

-- Admin, inventory manager, and branch sales can manage their branch
CREATE POLICY "Admin and inventory managers can manage branch inventory"
  ON public.branch_inventory FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'inventory_manager')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'inventory_manager')
  );

-- Branch sales users can view only their branch
CREATE POLICY "Cairo sales can view cairo branch"
  ON public.branch_inventory FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales_cairo') AND branch = 'cairo'
  );

CREATE POLICY "North coast sales can view north coast branch"
  ON public.branch_inventory FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales_north_coast') AND branch = 'north_coast'
  );
