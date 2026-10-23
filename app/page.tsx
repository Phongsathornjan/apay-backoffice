"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { FullPageLoader } from "@/components/auth/require-auth";

export default function RootPage() {
  const { isHydrating, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isHydrating) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    router.replace(session.user.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }, [isHydrating, session, router]);

  return <FullPageLoader label="กำลังพาไปยัง Dashboard..." />;
}
