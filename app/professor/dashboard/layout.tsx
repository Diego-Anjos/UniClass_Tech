import { ProfessorDashboardShell } from "@/components/professor/professor-dashboard-shell";

export default function ProfessorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfessorDashboardShell>{children}</ProfessorDashboardShell>;
}
