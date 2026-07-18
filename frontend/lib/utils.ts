import { clsx, type ClassValue } from "clsx";

// Bir nechta tailwind class nomlarini xavfsiz birlashtirish uchun yordamchi funksiya
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
