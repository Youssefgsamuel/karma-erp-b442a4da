-- Fix the notifications INSERT policy to be more restrictive
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only allow users with specific roles to create notifications
CREATE POLICY "Relevant roles can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manufacture_manager'::app_role) OR 
  has_role(auth.uid(), 'purchasing'::app_role)
);