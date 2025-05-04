import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves a logo URL to ensure it works correctly throughout the application
 * Handles both data URLs and relative paths
 */
export function getLogoUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // If it's a data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }
  
  // If it's already an absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Otherwise, it's a relative URL, prepend with origin
  return `${window.location.origin}${url}`;
}
