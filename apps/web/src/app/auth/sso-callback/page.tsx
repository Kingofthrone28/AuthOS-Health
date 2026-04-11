"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SsoCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    const tenantId = searchParams.get("tenantId");

    if (token && tenantId) {
      sessionStorage.setItem("accessToken", token);
      sessionStorage.setItem("tenantId", tenantId);
      router.replace("/dashboard");
    } else {
      router.replace("/login?error=sso_failed");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Completing sign-in...</p>
    </div>
  );
}
