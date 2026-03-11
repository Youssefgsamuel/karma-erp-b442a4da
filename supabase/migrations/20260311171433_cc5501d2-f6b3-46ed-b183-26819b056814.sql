
-- Allow branch sales users to manage sales orders
CREATE POLICY "Branch sales can manage sales orders"
  ON public.sales_orders FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'sales_cairo') OR 
    has_role(auth.uid(), 'sales_north_coast')
  )
  WITH CHECK (
    has_role(auth.uid(), 'sales_cairo') OR 
    has_role(auth.uid(), 'sales_north_coast')
  );

-- Allow branch sales users to view products
-- (already covered by "All authenticated can view products" policy)

-- Allow branch sales users to view quotation items (needed for sales order creation)
-- (already covered by "All authenticated can view quotation items" policy)
