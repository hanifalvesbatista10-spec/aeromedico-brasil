"use client";

import { useId, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { LeadOrigin } from "@/lib/types";

type FieldErrors = Record<string, string | undefined>;

export function LeadForm({
  origin,
  interestLabel = "O que você procura?",
  interestPlaceholder = "Ex.: curso de transporte aeromédico",
}: {
  origin: LeadOrigin;
  interestLabel?: string;
  interestPlaceholder?: string;
}) {
  const formId = useId();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setFieldErrors({});
    setFormError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      profession: String(data.get("profession") ?? ""),
      interest: String(data.get("interest") ?? ""),
      message: String(data.get("message") ?? ""),
      origin,
      consentGiven: data.get("consentGiven") === "on",
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 400) {
        const body = await response.json();
        const properties = body?.error?.properties ?? {};
        const nextErrors: FieldErrors = {};
        for (const key of Object.keys(properties)) {
          nextErrors[key] = properties[key]?.errors?.[0];
        }
        setFieldErrors(nextErrors);
        setStatus("error");
        return;
      }

      if (!response.ok) {
        setFormError("Não foi possível enviar agora. Tente novamente em instantes.");
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("success");
    } catch {
      setFormError("Não foi possível enviar agora. Verifique sua conexão e tente novamente.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${formId}-name`}
          name="name"
          label="Nome completo"
          error={fieldErrors.name}
          required
        />
        <Field
          id={`${formId}-email`}
          name="email"
          type="email"
          label="E-mail"
          error={fieldErrors.email}
          required
        />
        <Field
          id={`${formId}-phone`}
          name="phone"
          label="Telefone"
          error={fieldErrors.phone}
          required
        />
        <Field
          id={`${formId}-profession`}
          name="profession"
          label="Profissão"
          error={fieldErrors.profession}
          required
        />
      </div>

      <Field
        id={`${formId}-interest`}
        name="interest"
        label={interestLabel}
        placeholder={interestPlaceholder}
        error={fieldErrors.interest}
        required
      />

      <div className="space-y-2">
        <Label htmlFor={`${formId}-message`}>Mensagem</Label>
        <Textarea
          id={`${formId}-message`}
          name="message"
          rows={4}
          required
          aria-invalid={Boolean(fieldErrors.message)}
        />
        {fieldErrors.message && (
          <p className="text-sm text-destructive">{fieldErrors.message}</p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <input
          id={`${formId}-consent`}
          name="consentGiven"
          type="checkbox"
          className="mt-1 size-4 rounded border-border"
        />
        <Label htmlFor={`${formId}-consent`} className="text-sm font-normal text-gray-600">
          Autorizo o uso dos meus dados para retorno de contato, conforme a
          Política de Privacidade.
        </Label>
      </div>
      {fieldErrors.consentGiven && (
        <p className="text-sm text-destructive">{fieldErrors.consentGiven}</p>
      )}

      {formError && <p className="text-sm text-destructive">{formError}</p>}
      {status === "success" && (
        <p className="text-sm font-medium text-navy-700">
          Mensagem enviada. A equipe entra em contato em breve.
        </p>
      )}

      <Button type="submit" size="lg" disabled={status === "loading"}>
        {status === "loading" ? "Enviando..." : "Enviar"}
      </Button>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  placeholder,
  error,
  required,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
