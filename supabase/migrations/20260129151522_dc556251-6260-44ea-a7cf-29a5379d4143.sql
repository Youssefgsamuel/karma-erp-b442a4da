-- Drop the existing check constraint and recreate with all valid statuses
ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;

ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_status_check 
CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'confirmed', 'completed'));