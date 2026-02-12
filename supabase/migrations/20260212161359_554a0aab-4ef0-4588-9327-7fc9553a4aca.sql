
-- Create audit trail table for MO deletions
CREATE TABLE public.mo_deletion_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mo_number text NOT NULL,
  mo_id uuid NOT NULL,
  deleted_by uuid,
  deletion_reason text,
  mo_data jsonb NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mo_deletion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage MO deletion audit"
ON public.mo_deletion_audit
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated can view MO deletion audit"
ON public.mo_deletion_audit
FOR SELECT
USING (true);
