import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { FileText, File, type LucideIcon } from "lucide-react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isImageFile(nameOrUrl: string): boolean {
  const path = nameOrUrl.split("?")[0];
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path);
}

export function isPdfFile(nameOrUrl: string): boolean {
  const path = nameOrUrl.split("?")[0];
  return /\.pdf$/i.test(path);
}

export function getFileIcon(nameOrUrl: string): LucideIcon {
  const path = nameOrUrl.split("?")[0].toLowerCase();
  if (/\.(pdf|doc|docx|ppt|pptx)$/.test(path)) return FileText;
  if (/\.(xls|xlsx|csv)$/.test(path)) return FileText;
  return File;
}
