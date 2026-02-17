import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for merging conditional classes

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
