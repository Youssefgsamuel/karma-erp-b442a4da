export type AppRole = 'admin' | 'hr' | 'manufacture_manager' | 'inventory_manager' | 'purchasing' | 'cfo';

export type UnitOfMeasure = 'pcs' | 'kg' | 'g' | 'l' | 'ml' | 'm' | 'cm' | 'mm' | 'box' | 'pack';

export type ProductType = 'in_house' | 'outsourced';

export type InventoryTransactionType = 'in' | 'out' | 'adjustment';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
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

export interface RawMaterial {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: UnitOfMeasure;
  cost_per_unit: number;
  minimum_stock: number;
  current_stock: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
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
  manufacturing_time_minutes: number;
  minimum_stock: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockAlert {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  type: 'raw_material' | 'product';
}
