import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeadRow } from "@/lib/supabase/types";
import type { LeadsRepository } from "../types";
import type { Lead } from "@/lib/types";

function toDomain(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    profession: row.profession,
    interest: row.interest,
    message: row.message,
    origin: row.origin,
    consentGiven: row.consent_given,
    createdAt: row.created_at,
    status: row.status,
    notes: row.notes,
  };
}

function toRow(input: Lead) {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    profession: input.profession,
    interest: input.interest,
    message: input.message,
    origin: input.origin,
    consent_given: input.consentGiven,
    status: input.status,
    notes: input.notes,
  };
}

function toRowPatch(patch: Partial<Lead>) {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes;
  return row;
}

export function createSupabaseLeadsRepository(): LeadsRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`Falha ao carregar leads: ${error.message}`);
      return (data as LeadRow[]).map(toDomain);
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .insert(toRow(input))
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao registrar lead: ${error.message}`);
      return toDomain(data as LeadRow);
    },

    async update(id, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .update(toRowPatch(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(`Falha ao atualizar lead: ${error.message}`);
      return data ? toDomain(data as LeadRow) : null;
    },

    async remove(id) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir lead: ${error.message}`);
    },
  };
}
