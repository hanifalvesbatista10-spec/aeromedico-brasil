import { createServerSupabaseClient } from "@/lib/supabase/server";

export class AdminGuardError extends Error {
  constructor(public readonly reason: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(
      reason === "UNAUTHENTICATED"
        ? "Sessão administrativa não encontrada."
        : "Este usuário não tem permissão de administrador."
    );
    this.name = "AdminGuardError";
  }
}

/**
 * Confere, no servidor, que a requisição pertence a um administrador
 * autorizado antes de qualquer mutação. É defesa em profundidade — a
 * garantia real é a política de RLS de cada tabela (`is_admin()`), que
 * rejeitaria a escrita de qualquer forma; isto só transforma o erro do
 * banco em uma mensagem clara para a Server Action que chamou.
 */
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AdminGuardError("UNAUTHENTICATED");
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) {
    throw new AdminGuardError("FORBIDDEN");
  }

  return { supabase, user };
}
