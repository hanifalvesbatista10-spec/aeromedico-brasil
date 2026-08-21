"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/services/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function login(formData: FormData) {
    setLoading(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Configure as variáveis do Supabase para ativar o login. O painel demonstrativo está disponível abaixo."); setLoading(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
    if (error) { setMessage("E-mail ou senha inválidos."); setLoading(false); return; }
    router.replace("/admin"); router.refresh();
  }
  return <form action={login} className="mt-7 space-y-4"><div><label className="mb-2 block text-xs font-semibold text-slate-600" htmlFor="email">E-mail administrativo</label><Input id="email" name="email" type="email" autoComplete="email" placeholder="admin@aeromedico.com.br" required /></div><div><label className="mb-2 block text-xs font-semibold text-slate-600" htmlFor="password">Senha</label><Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required /></div>{message && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">{message}</p>}<Button className="w-full" size="lg" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />} Entrar com segurança</Button></form>;
}
