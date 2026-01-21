import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialAvailability {
  raw_material_id: string;
  raw_material_name: string;
  required_quantity: number;
  available_quantity: number;
  is_available: boolean;
  shortage: number;
}

export interface BomAvailabilityResult {
  product_id: string;
  product_name: string;
  quantity_to_produce: number;
  materials: MaterialAvailability[];
  is_fully_available: boolean;
  has_bom: boolean;
}

export function useBomAvailability(productId: string, quantity: number = 1) {
  return useQuery({
    queryKey: ['bom-availability', productId, quantity],
    queryFn: async (): Promise<BomAvailabilityResult> => {
      // Get product info
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', productId)
        .single();

      // Get BOM items for this product
      const { data: bomItems, error } = await supabase
        .from('bom_items')
        .select(`
          *,
          raw_material:raw_materials(id, name, current_stock, unit)
        `)
        .eq('product_id', productId);

      if (error) throw error;

      if (!bomItems || bomItems.length === 0) {
        return {
          product_id: productId,
          product_name: product?.name || 'Unknown',
          quantity_to_produce: quantity,
          materials: [],
          is_fully_available: true,
          has_bom: false,
        };
      }

      const materials: MaterialAvailability[] = bomItems.map((item: any) => {
        const requiredQty = Number(item.quantity) * quantity;
        const availableQty = Number(item.raw_material?.current_stock || 0);
        const shortage = Math.max(0, requiredQty - availableQty);
        
        return {
          raw_material_id: item.raw_material_id,
          raw_material_name: item.raw_material?.name || 'Unknown',
          required_quantity: requiredQty,
          available_quantity: availableQty,
          is_available: availableQty >= requiredQty,
          shortage,
        };
      });

      return {
        product_id: productId,
        product_name: product?.name || 'Unknown',
        quantity_to_produce: quantity,
        materials,
        is_fully_available: materials.every(m => m.is_available),
        has_bom: true,
      };
    },
    enabled: !!productId && quantity > 0,
  });
}
