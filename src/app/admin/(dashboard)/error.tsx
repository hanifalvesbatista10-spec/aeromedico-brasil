"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
      <p className="font-heading text-base font-semibold text-navy-950">
        Não foi possível carregar estes dados
      </p>
      <p className="max-w-sm text-sm text-gray-600">{error.message}</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
