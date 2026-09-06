import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow, SiteSettingsRow } from "@/lib/supabase/types";
import type { SettingsRepository } from "../types";
import type { SiteSettings } from "@/lib/types";

function toDomain(profile: ProfileRow, settings: SiteSettingsRow): SiteSettings {
  return {
    siteName: settings.site_name,
    siteDescription: settings.site_description,
    profile: {
      name: profile.name,
      role: profile.role,
      credentials: profile.credentials,
      shortBio: profile.short_bio,
      longBio: profile.long_bio,
      resumeSummary: profile.resume_summary,
      photoUrl: profile.photo_url,
      instagramHandle: profile.instagram_handle,
    },
    stats: settings.stats,
    whatsappUrl: settings.whatsapp_url,
    email: settings.email,
    instagramUrl: settings.instagram_url,
    primaryCta: { label: settings.primary_cta_label, href: settings.primary_cta_href },
    secondaryCta: { label: settings.secondary_cta_label, href: settings.secondary_cta_href },
    footerNote: settings.footer_note,
    logoUrl: settings.logo_url,
    seoTitle: settings.seo_title,
    seoDescription: settings.seo_description,
  };
}

function toProfileRowPatch(patch: Partial<SiteSettings>) {
  const profile = patch.profile;
  if (!profile) return null;
  const row: Record<string, unknown> = {};
  if (profile.name !== undefined) row.name = profile.name;
  if (profile.role !== undefined) row.role = profile.role;
  if (profile.credentials !== undefined) row.credentials = profile.credentials;
  if (profile.shortBio !== undefined) row.short_bio = profile.shortBio;
  if (profile.longBio !== undefined) row.long_bio = profile.longBio;
  if (profile.resumeSummary !== undefined) row.resume_summary = profile.resumeSummary;
  if (profile.photoUrl !== undefined) row.photo_url = profile.photoUrl;
  if (profile.instagramHandle !== undefined) row.instagram_handle = profile.instagramHandle;
  return Object.keys(row).length > 0 ? row : null;
}

function toSettingsRowPatch(patch: Partial<SiteSettings>) {
  const row: Record<string, unknown> = {};
  if (patch.siteName !== undefined) row.site_name = patch.siteName;
  if (patch.siteDescription !== undefined) row.site_description = patch.siteDescription;
  if (patch.stats !== undefined) row.stats = patch.stats;
  if (patch.whatsappUrl !== undefined) row.whatsapp_url = patch.whatsappUrl;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.instagramUrl !== undefined) row.instagram_url = patch.instagramUrl;
  if (patch.primaryCta?.label !== undefined) row.primary_cta_label = patch.primaryCta.label;
  if (patch.primaryCta?.href !== undefined) row.primary_cta_href = patch.primaryCta.href;
  if (patch.secondaryCta?.label !== undefined)
    row.secondary_cta_label = patch.secondaryCta.label;
  if (patch.secondaryCta?.href !== undefined) row.secondary_cta_href = patch.secondaryCta.href;
  if (patch.footerNote !== undefined) row.footer_note = patch.footerNote;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) row.seo_description = patch.seoDescription;
  return row;
}

export function createSupabaseSettingsRepository(): SettingsRepository {
  return {
    async get() {
      const supabase = await createServerSupabaseClient();
      const [profileResult, settingsResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", true).single(),
        supabase.from("site_settings").select("*").eq("id", true).single(),
      ]);
      if (profileResult.error) {
        throw new Error(`Falha ao carregar perfil: ${profileResult.error.message}`);
      }
      if (settingsResult.error) {
        throw new Error(`Falha ao carregar configurações: ${settingsResult.error.message}`);
      }
      return toDomain(profileResult.data as ProfileRow, settingsResult.data as SiteSettingsRow);
    },

    async update(patch) {
      const supabase = await createServerSupabaseClient();
      const profilePatch = toProfileRowPatch(patch);
      const settingsPatch = toSettingsRowPatch(patch);

      if (profilePatch) {
        const { error } = await supabase.from("profiles").update(profilePatch).eq("id", true);
        if (error) throw new Error(`Falha ao salvar perfil: ${error.message}`);
      }
      if (Object.keys(settingsPatch).length > 0) {
        const { error } = await supabase
          .from("site_settings")
          .update(settingsPatch)
          .eq("id", true);
        if (error) throw new Error(`Falha ao salvar configurações: ${error.message}`);
      }

      return this.get();
    },
  };
}
