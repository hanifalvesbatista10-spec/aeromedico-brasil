"use client";

import { Suspense, useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInAdmin, requestAdminPasswordReset } from "@/lib/actions/auth";

const DENIED_MESSAGE =
  "Este usuário não tem permissão para acessar o painel administrativo.";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <p className="font-heading text-lg font-bold text-navy-950">
          Aeromédico Brasil
        </p>
        <h1 className="mt-1 text-sm text-gray-600">
          Acesso ao painel administrativo
        </h1>
      </div>
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deniedOnArrival = searchParams.get("erro") === "sem-permissao";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    deniedOnArrival ? DENIED_MESSAGE : null
  );
  const [isPending, startTransition] = useTransition();

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sent">("idle");
  const [isResetPending, startResetTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInAdmin(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startResetTransition(async () => {
      await requestAdminPasswordReset(resetEmail);
      setResetStatus("sent");
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <p className="font-heading text-lg font-bold text-navy-950">
          Aeromédico Brasil
        </p>
        <h1 className="mt-1 text-sm text-gray-600">
          Acesso ao painel administrativo
        </h1>

        {!resetOpen ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                aria-invalid={Boolean(error)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                aria-invalid={Boolean(error)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Entrando..." : "Entrar"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setResetOpen(true);
                setResetEmail(email);
                setResetStatus("idle");
              }}
              className="w-full text-center text-sm text-gray-600 underline-offset-2 hover:underline"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="mt-6 space-y-4" noValidate>
            <p className="text-sm text-gray-600">
              Informe seu e-mail administrativo. Se ele estiver cadastrado,
              você recebe um link para redefinir a senha.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
                autoFocus
              />
            </div>

            {resetStatus === "sent" && (
              <p role="status" className="text-sm text-navy-700">
                Se o e-mail estiver cadastrado, o link de redefinição foi
                enviado.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isResetPending}>
              {isResetPending ? "Enviando..." : "Enviar link de redefinição"}
            </Button>

            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="w-full text-center text-sm text-gray-600 underline-offset-2 hover:underline"
            >
              Voltar para o login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
