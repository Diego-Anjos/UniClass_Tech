import { AlunoDashboardShell } from "@/components/aluno/aluno-dashboard-shell";

export default function AlunoDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AlunoDashboardShell>{children}</AlunoDashboardShell>;
}
