import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with comma thousand separators
 * Numbers > 1000 get formatted with commas (e.g., 1,234)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string
 */
export function formatNumber(value: number | string, decimals: number = 0): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number as currency with comma separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string with $ prefix
 */
export function formatCurrency(value: number | string, decimals: number = 2): string {
  return `$${formatNumber(value, decimals)}`;
}
