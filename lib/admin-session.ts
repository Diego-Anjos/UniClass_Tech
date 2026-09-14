"use client";

export const ADMIN_SESSION_KEY = "adminLogado";

export type AdminSession = {
  nome: string;
  role: "admin";
};

export function limparSessaoAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

/** Limpa localStorage e remove o cookie httpOnly de papel. */
export function encerrarSessaoAdmin() {
  limparSessaoAdmin();
  if (typeof window !== "undefined") {
    void fetch("/api/auth/logout", { method: "POST" });
  }
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
