import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const createLocaleSorter =
  <T>(field: keyof T) =>
  (a: T, b: T) =>
    String(a[field]).localeCompare(String(b[field]), 'tr', {
      numeric: true,
      sensitivity: 'base',
    });
