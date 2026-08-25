import { LandingPage } from "@/components/landing/landing-page";
import { createSupabaseServerClient } from "@/services/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = supabase ? await supabase.from("site_content").select("section_key,title,body").eq("status", "published") : { data: null };
  const content = Object.fromEntries((data ?? []).map((row) => [row.section_key, { title: row.title, body: row.body }]));
  return <LandingPage content={content} />;
}
