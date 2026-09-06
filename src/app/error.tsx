"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-heading text-lg font-semibold text-navy-950">
        Não foi possível carregar esta página agora
      </p>
      <p className="max-w-sm text-sm text-gray-600">
        Pode ser uma instabilidade temporária. Tente novamente em instantes.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
