export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Configuração do Supabase ausente: defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no ambiente antes de usar o painel " +
        "ou a leitura de conteúdo do site."
    );
  }

  return { url, publishableKey };
}
