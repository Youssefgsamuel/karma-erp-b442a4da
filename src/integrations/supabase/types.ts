export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bom_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          raw_material_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          raw_material_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          raw_material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          raw_material_id: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          raw_material_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          raw_material_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"]
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      job_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      manufacturing_orders: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          created_by: string | null
          id: string
          mo_number: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          priority: string
          product_id: string
          quantity: number
          sales_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mo_number: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          priority?: string
          product_id: string
          quantity?: number
          sales_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mo_number?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          priority?: string
          product_id?: string
          quantity?: number
          sales_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mo_items: {
        Row: {
          created_at: string
          id: string
          mo_id: string
          notes: string | null
          product_id: string
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mo_id: string
          notes?: string | null
          product_id: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mo_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mo_items_mo_id_fkey"
            columns: ["mo_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      product_materials: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          raw_material_id: string
          source_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          raw_material_id: string
          source_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          raw_material_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_materials_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          current_stock: number
          description: string | null
          id: string
          is_active: boolean
          manufacturing_time_minutes: number
          minimum_stock: number
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          selling_price: number
          sku: string
          unit: Database["public"]["Enums"]["unit_of_measure"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          manufacturing_time_minutes?: number
          minimum_stock?: number
          name: string
          product_type?: Database["public"]["Enums"]["product_type"]
          selling_price?: number
          sku: string
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean
          manufacturing_time_minutes?: number
          minimum_stock?: number
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          selling_price?: number
          sku?: string
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_approved: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quality_control_records: {
        Row: {
          created_at: string
          id: string
          inspected_at: string | null
          inspector_id: string | null
          mo_id: string
          notes: string | null
          product_id: string
          quantity: number
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspector_id?: string | null
          mo_id: string
          notes?: string | null
          product_id: string
          quantity: number
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspector_id?: string | null
          mo_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_control_records_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_control_records_mo_id_fkey"
            columns: ["mo_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_control_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          id: string
          product_id: string | null
          quantity: number
          quotation_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount_percent: number
          id: string
          notes: string | null
          quotation_number: string
          status: string
          subtotal: number
          tax_percent: number
          total: number
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_percent?: number
          id?: string
          notes?: string | null
          quotation_number: string
          status?: string
          subtotal?: number
          tax_percent?: number
          total?: number
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_percent?: number
          id?: string
          notes?: string | null
          quotation_number?: string
          status?: string
          subtotal?: number
          tax_percent?: number
          total?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_material_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          category_id: string | null
          cost_per_unit: number
          created_at: string
          current_stock: number
          description: string | null
          id: string
          is_for_sale: boolean
          name: string
          purchasing_quantity: number
          reorder_point: number
          sku: string
          supplier_id: string | null
          unit: Database["public"]["Enums"]["unit_of_measure"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_for_sale?: boolean
          name: string
          purchasing_quantity?: number
          reorder_point?: number
          sku: string
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_for_sale?: boolean
          name?: string
          purchasing_quantity?: number
          reorder_point?: number
          sku?: string
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "raw_material_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      salaries: {
        Row: {
          base_salary: number
          bonus: number
          created_at: string
          created_by: string | null
          employee_id: string | null
          employee_name: string | null
          employee_number: string
          housing_allowance: number
          id: string
          job_category_id: string | null
          month: number
          net_pay: number | null
          notes: string | null
          other_allowances: number
          other_deductions: number
          overtime_hours: number
          overtime_rate: number
          payment_date: string | null
          payment_status: string
          tax_deduction: number
          transport_allowance: number
          updated_at: string
          work_location: string | null
          year: number
        }
        Insert: {
          base_salary?: number
          bonus?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          employee_name?: string | null
          employee_number: string
          housing_allowance?: number
          id?: string
          job_category_id?: string | null
          month: number
          net_pay?: number | null
          notes?: string | null
          other_allowances?: number
          other_deductions?: number
          overtime_hours?: number
          overtime_rate?: number
          payment_date?: string | null
          payment_status?: string
          tax_deduction?: number
          transport_allowance?: number
          updated_at?: string
          work_location?: string | null
          year: number
        }
        Update: {
          base_salary?: number
          bonus?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          employee_name?: string | null
          employee_number?: string
          housing_allowance?: number
          id?: string
          job_category_id?: string | null
          month?: number
          net_pay?: number | null
          notes?: string | null
          other_allowances?: number
          other_deductions?: number
          overtime_hours?: number
          overtime_rate?: number
          payment_date?: string | null
          payment_status?: string
          tax_deduction?: number
          transport_allowance?: number
          updated_at?: string
          work_location?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_job_category_id_fkey"
            columns: ["job_category_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          discount_percent: number
          due_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          quotation_id: string | null
          status: string
          subtotal: number
          tax_percent: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          discount_percent?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_percent?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          discount_percent?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_percent?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          payment_terms: string | null
          payment_terms_notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_terms?: string | null
          payment_terms_notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_terms?: string | null
          payment_terms_notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "hr"
        | "manufacture_manager"
        | "inventory_manager"
        | "purchasing"
        | "cfo"
      inventory_transaction_type: "in" | "out" | "adjustment"
      product_type: "in_house" | "outsourced" | "semi_finished" | "hybrid"
      unit_of_measure:
        | "pcs"
        | "kg"
        | "g"
        | "l"
        | "ml"
        | "m"
        | "cm"
        | "mm"
        | "box"
        | "pack"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "hr",
        "manufacture_manager",
        "inventory_manager",
        "purchasing",
        "cfo",
      ],
      inventory_transaction_type: ["in", "out", "adjustment"],
      product_type: ["in_house", "outsourced", "semi_finished", "hybrid"],
      unit_of_measure: [
        "pcs",
        "kg",
        "g",
        "l",
        "ml",
        "m",
        "cm",
        "mm",
        "box",
        "pack",
      ],
    },
  },
} as const
