import { Suspense } from "react";
import { SsoCallbackClient } from "./SsoCallbackClient";

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50" />}>
      <SsoCallbackClient />
    </Suspense>
  );
}
