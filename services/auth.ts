import { createSupabaseServerClient } from "@/services/supabase/server";

export async function getAdminSession() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, configured: false, authorized: false };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, configured: true, authorized: false };
  const { data: profile } = await supabase.from("admin_profiles").select("role").eq("id", data.user.id).single();
  return { supabase, user: data.user, configured: true, authorized: Boolean(profile) };
}
