"use client";

export const ADMIN_SESSION_KEY = "adminLogado";

export type AdminSession = {
  nome: string;
  role: "admin";
};

export function limparSessaoAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function salvarSessaoAdmin(admin: AdminSession) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
}

export function lerSessaoAdmin(): AdminSession | null {
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.role || parsed.role !== "admin") return null;
    return parsed;
  } catch {
    return null;
  }
}
