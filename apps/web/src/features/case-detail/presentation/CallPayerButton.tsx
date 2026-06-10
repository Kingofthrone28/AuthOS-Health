"use client";

import { useState, useTransition } from "react";
import { Phone, X } from "lucide-react";
import { startPayerCall } from "../actions";

interface CallPayerButtonProps {
  caseId: string;
}

export function CallPayerButton({ caseId }: CallPayerButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [toNumber, setToNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      try {
        const trimmedToNumber = toNumber.trim();
        const trimmedNotes = notes.trim();
        await startPayerCall(caseId, {
          ...(trimmedToNumber ? { toNumber: trimmedToNumber } : {}),
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        });
        setIsOpen(false);
        setToNumber("");
        setNotes("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start the call.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {isOpen && (
          <button
            type="button"
            onClick={() => {
              if (isPending) return;
              setIsOpen(false);
              setError(null);
            }}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={15} />
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              handleSubmit();
              return;
            }
            setIsOpen(true);
            setError(null);
          }}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Phone size={15} />
          {isPending ? "Calling..." : isOpen ? "Start call" : "Call payer"}
        </button>
      </div>

      {isOpen && (
        <div className="w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">Payer call details</p>
            <p className="text-xs leading-5 text-gray-500">
              Add optional simulation notes here. In mock voice mode, these notes are written into the completed transcript shown on the Voice screen.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Payer phone
              </span>
              <input
                type="tel"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
                placeholder="Optional in mock mode"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Simulation notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder={"Example:\nReference number is AB12345.\nAuthorization still pending.\nNeed updated office notes before review continues."}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-6 text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              />
            </label>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
