export type AppRole = 'admin' | 'hr' | 'manufacture_manager' | 'inventory_manager' | 'purchasing' | 'cfo';

export type UnitOfMeasure = 'pcs' | 'kg' | 'g' | 'l' | 'ml' | 'm' | 'cm' | 'mm' | 'box' | 'pack';

export type ProductType = 'in_house' | 'outsourced' | 'hybrid';

export type InventoryTransactionType = 'in' | 'out' | 'adjustment';

export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export type MaterialSourceType = 'in_house' | 'outsourced';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface JobCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface RawMaterial {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: UnitOfMeasure;
  cost_per_unit: number;
  purchasing_quantity: number;
  current_stock: number;
  reorder_point: number;
  supplier_id?: string;
  supplier?: Supplier;
  category_id?: string;
  is_for_sale: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawMaterialCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  product_type: ProductType;
  unit: UnitOfMeasure;
  selling_price: number;
  cost_price: number;
  manufacturing_time_minutes: number;
  minimum_stock: number;
  current_stock: number;
  is_active: boolean;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface MoItem {
  id: string;
  mo_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface ProductMaterial {
  id: string;
  product_id: string;
  raw_material_id: string;
  quantity: number;
  source_type: MaterialSourceType;
  notes?: string;
  created_at: string;
}

export interface BomItem {
  id: string;
  product_id: string;
  raw_material_id: string;
  quantity: number;
  notes?: string;
  created_at: string;
  raw_material?: RawMaterial;
}

export interface InventoryTransaction {
  id: string;
  raw_material_id?: string;
  product_id?: string;
  transaction_type: InventoryTransactionType;
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  payment_terms_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierWithStats extends Supplier {
  total_quantity: number;
  total_spent: number;
  avg_unit_price: number;
  materials_count: number;
}

export interface Salary {
  id: string;
  employee_id: string;
  employee_number: string;
  work_location?: string;
  job_category_id?: string;
  base_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  overtime_hours: number;
  overtime_rate: number;
  bonus: number;
  tax_deduction: number;
  other_deductions: number;
  net_pay: number;
  payment_date?: string;
  payment_status: PaymentStatus;
  month: number;
  year: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  employee?: Profile;
  job_category?: JobCategory;
}

export interface StockAlert {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  type: 'raw_material' | 'product';
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}
