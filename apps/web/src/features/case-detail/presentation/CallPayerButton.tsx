"use client";

import { useState, useTransition } from "react";
import { Phone } from "lucide-react";
import { startPayerCall } from "../actions";

interface CallPayerButtonProps {
  caseId: string;
}

export function CallPayerButton({ caseId }: CallPayerButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const entered = window.prompt("Payer phone number");
    if (entered === null) return;

    const toNumber = entered.trim() || undefined;
    setError(null);

    startTransition(async () => {
      try {
        await startPayerCall(caseId, toNumber);
      } catch {
        setError("Could not start the call.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Phone size={15} />
        {isPending ? "Calling..." : "Call payer"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
