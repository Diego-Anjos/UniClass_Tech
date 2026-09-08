import { AdmDashboardShell } from "@/components/adm/adm-dashboard-shell";

export default function AdmDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdmDashboardShell>{children}</AdmDashboardShell>;
}
