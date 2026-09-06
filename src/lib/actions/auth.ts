"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SignInResult {
  error: string | null;
}

const GENERIC_ERROR = "E-mail ou senha inválidos.";
const FORBIDDEN_ERROR =
  "Este usuário não tem permissão para acessar o painel administrativo.";

export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  if (!email.trim() || !password) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (signInError) {
    return { error: GENERIC_ERROR };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: FORBIDDEN_ERROR };
  }

  return { error: null };
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}

export interface RequestPasswordResetResult {
  error: string | null;
}

export async function requestAdminPasswordReset(
  email: string
): Promise<RequestPasswordResetResult> {
  if (!email.trim()) {
    return { error: "Informe um e-mail." };
  }

  const supabase = await createServerSupabaseClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Resposta é sempre "ok" independente de o e-mail existir ou não, para
  // não permitir enumeração de administradores cadastrados.
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${siteUrl}/admin/login`,
  });

  return { error: null };
}
