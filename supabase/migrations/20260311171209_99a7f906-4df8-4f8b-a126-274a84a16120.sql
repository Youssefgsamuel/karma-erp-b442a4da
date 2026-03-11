
-- Add new sales roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_cairo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_north_coast';
