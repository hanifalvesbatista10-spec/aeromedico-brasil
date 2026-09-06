"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

const MATERIAL_EXTENSIONS: Record<string, string> = {
  ...IMAGE_EXTENSIONS,
  "application/pdf": "pdf",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MATERIAL_BYTES = 20 * 1024 * 1024;

export class UploadValidationError extends Error {}

/**
 * Nome de arquivo nunca vem do usuário: usamos um UUID novo e a extensão é
 * derivada só do MIME type detectado pelo navegador (nunca do nome
 * original), então não há como um nome de arquivo malicioso ("foto.png.exe")
 * influenciar o objeto salvo. O bucket também valida `allowed_mime_types`
 * no servidor — a checagem aqui é só para dar feedback rápido ao usuário.
 */
function buildSafePath(file: File, extensions: Record<string, string>): string {
  const extension = extensions[file.type];
  if (!extension) {
    throw new UploadValidationError(
      "Formato não suportado. Envie um arquivo " +
        Object.values(extensions).join(", ").toUpperCase() +
        "."
    );
  }
  return `${crypto.randomUUID()}.${extension}`;
}

export interface SiteMediaUploadResult {
  publicUrl: string;
  path: string;
}

/** Envia uma imagem direto do navegador para o bucket público `site-media`. */
export async function uploadSiteMedia(file: File): Promise<SiteMediaUploadResult> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadValidationError("Arquivo muito grande. O limite é 5 MB.");
  }
  const path = buildSafePath(file, IMAGE_EXTENSIONS);

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage
    .from("site-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

/** Remove um objeto do bucket público `site-media`. */
export async function removeSiteMedia(path: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  await supabase.storage.from("site-media").remove([path]);
}

export interface MaterialUploadResult {
  path: string;
}

/** Envia um PDF ou imagem direto do navegador para o bucket privado `materials`. */
export async function uploadMaterialFile(file: File): Promise<MaterialUploadResult> {
  if (file.size > MAX_MATERIAL_BYTES) {
    throw new UploadValidationError("Arquivo muito grande. O limite é 20 MB.");
  }
  const path = buildSafePath(file, MATERIAL_EXTENSIONS);

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage
    .from("materials")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  return { path };
}
