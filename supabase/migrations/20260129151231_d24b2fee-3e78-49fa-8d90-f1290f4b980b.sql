-- Drop the existing check constraint and recreate with all valid statuses
ALTER TABLE public.manufacturing_orders DROP CONSTRAINT IF EXISTS manufacturing_orders_status_check;

ALTER TABLE public.manufacturing_orders ADD CONSTRAINT manufacturing_orders_status_check 
CHECK (status IN ('planned', 'in_progress', 'under_qc', 'completed', 'qc_rejected', 'closed', 'cancelled'));