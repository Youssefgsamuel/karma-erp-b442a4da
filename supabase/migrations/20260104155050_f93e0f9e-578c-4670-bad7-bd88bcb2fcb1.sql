-- Create customers table for quotations
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotation items table
CREATE TABLE public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales orders table
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  quotation_id UUID REFERENCES public.quotations(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manufacturing orders table
CREATE TABLE public.manufacturing_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mo_number TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  planned_start DATE,
  planned_end DATE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "All authenticated can view customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Admin and purchasing can manage customers" ON public.customers FOR ALL USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'purchasing')
);

-- Quotations policies
CREATE POLICY "All authenticated can view quotations" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Admin and purchasing can manage quotations" ON public.quotations FOR ALL USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'purchasing')
);

-- Quotation items policies
CREATE POLICY "All authenticated can view quotation items" ON public.quotation_items FOR SELECT USING (true);
CREATE POLICY "Admin and purchasing can manage quotation items" ON public.quotation_items FOR ALL USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'purchasing')
);

-- Sales orders policies
CREATE POLICY "All authenticated can view sales orders" ON public.sales_orders FOR SELECT USING (true);
CREATE POLICY "Admin and purchasing can manage sales orders" ON public.sales_orders FOR ALL USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'purchasing')
);

-- Manufacturing orders policies
CREATE POLICY "All authenticated can view manufacturing orders" ON public.manufacturing_orders FOR SELECT USING (true);
CREATE POLICY "Admin and manufacture manager can manage MOs" ON public.manufacturing_orders FOR ALL USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manufacture_manager')
);

-- Add update triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_manufacturing_orders_updated_at BEFORE UPDATE ON public.manufacturing_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();