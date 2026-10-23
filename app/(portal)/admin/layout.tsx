import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";

// Role validation happens against the client-side session store.
export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={["admin"]}>{children}</RequireAuth>;
}
