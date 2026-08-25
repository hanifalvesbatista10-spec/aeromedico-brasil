"use client";

import { CheckCircle2, Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LeadForm({ materialId }: { materialId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(formData: FormData) {
    setStatus("loading");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        materialId,
      }),
    });
    setStatus(response.ok ? "success" : "error");
  }

  if (status === "success") {
    return <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800"><CheckCircle2 /><strong>Solicitação registrada!</strong><span className="text-xs">O link configurado pelo ADM será enviado ao seu e-mail.</span></div>;
  }

  return (
    <form action={submit} className="mt-5 space-y-3">
      <Input name="name" placeholder="Seu nome" aria-label="Seu nome" required />
      <Input name="email" type="email" placeholder="Seu melhor e-mail" aria-label="Seu melhor e-mail" required />
      <Button className="w-full" disabled={status === "loading"}>
        {status === "loading" ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
        Receber gratuitamente
      </Button>
      {status === "error" && <p className="text-center text-xs text-red-600">Não foi possível enviar agora. Tente novamente.</p>}
      <p className="text-center text-[10px] leading-4 text-slate-400">Ao continuar, você concorda com a Política de Privacidade.</p>
    </form>
  );
}
