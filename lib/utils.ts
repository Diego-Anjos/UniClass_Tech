import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Força o navegador a ignorar cache de imagem (avatar no Storage). */
export function urlComCacheBust(url: string): string {
  const base = url.split("?")[0];
  return `${base}?t=${Date.now()}`;
}
