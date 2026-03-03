
-- Allow admin and inventory_manager to delete inventory transactions
CREATE POLICY "Admin and inventory manager can delete inventory transactions"
ON public.inventory_transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));
