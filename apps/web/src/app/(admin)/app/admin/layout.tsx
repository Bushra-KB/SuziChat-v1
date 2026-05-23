import type { ReactNode } from "react";
import { AdminAuthLayout } from "@/components/admin/admin-auth-layout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAuthLayout>{children}</AdminAuthLayout>;
}
