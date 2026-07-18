import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Bir nechta tailwind class nomlarini xavfsiz birlashtirish uchun yordamchi funksiya
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
