import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";

// This shell depends on browser-only auth state and live API data, so it is
// intentionally allowed to render after the client store hydrates.
export const instant = false;

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
