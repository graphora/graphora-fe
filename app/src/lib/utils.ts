import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 

export function formatLabel(key: string) {
  // Handle snake_case: replace underscores with spaces
  let formatted = key.replace(/_/g, ' ');
  
  // Handle camelCase: add space before uppercase letters and trim
  formatted = formatted.replace(/([A-Z])/g, ' $1').trim();
  
  // Capitalize the first letter of each word
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}