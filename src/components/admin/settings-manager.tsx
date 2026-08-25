"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/admin/media-uploader";
import { updateSettings } from "@/lib/actions/settings";
import type { SiteSettings } from "@/lib/types";

export function SettingsManager({ initialSettings }: { initialSettings: SiteSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setSaved(true);
    });
  }

  return (
    <div className="max-w-2xl space-y-10">
      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Dados profissionais
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Nome</Label>
            <Input
              id="settings-name"
              value={settings.profile.name}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  profile: { ...settings.profile, name: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-role">Cargo</Label>
            <Input
              id="settings-role"
              value={settings.profile.role}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  profile: { ...settings.profile, role: e.target.value },
                })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-credentials">
            Credenciais (uma por linha)
          </Label>
          <Textarea
            id="settings-credentials"
            rows={5}
            value={settings.profile.credentials.join("\n")}
            onChange={(e) =>
              setSettings({
                ...settings,
                profile: {
                  ...settings.profile,
                  credentials: e.target.value.split("\n"),
                },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-short-bio">Biografia curta</Label>
          <Textarea
            id="settings-short-bio"
            rows={3}
            value={settings.profile.shortBio}
            onChange={(e) =>
              setSettings({
                ...settings,
                profile: { ...settings.profile, shortBio: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-long-bio">Biografia completa</Label>
          <Textarea
            id="settings-long-bio"
            rows={5}
            value={settings.profile.longBio}
            onChange={(e) =>
              setSettings({
                ...settings,
                profile: { ...settings.profile, longBio: e.target.value },
              })
            }
          />
        </div>
        <MediaUploader
          label="Foto profissional"
          value={settings.profile.photoUrl}
          onChange={(url) =>
            setSettings({
              ...settings,
              profile: { ...settings.profile, photoUrl: url },
            })
          }
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Identidade visual
        </h2>
        <MediaUploader
          label="Logomarca oficial"
          value="/brand/logo.jpg"
          onChange={() => {
            /* troca de arquivo nesta fase não persiste — ver README */
          }}
        />
        <p className="text-xs text-gray-600">
          Logomarca oficial em uso, a partir do material de marca
          fornecido. Envie um novo arquivo aqui para substituir.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Números de autoridade
        </h2>
        {settings.stats.map((stat, index) => (
          <div key={stat.id} className="space-y-2">
            <Label htmlFor={`stat-${stat.id}`}>{stat.label}</Label>
            <Input
              id={`stat-${stat.id}`}
              value={stat.value}
              onChange={(e) => {
                const nextStats = [...settings.stats];
                nextStats[index] = { ...stat, value: e.target.value };
                setSettings({ ...settings, stats: nextStats });
              }}
            />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Contato e redes
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-email">E-mail</Label>
            <Input
              id="settings-email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-whatsapp">WhatsApp</Label>
            <Input
              id="settings-whatsapp"
              value={settings.whatsappUrl}
              onChange={(e) =>
                setSettings({ ...settings, whatsappUrl: e.target.value })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-instagram-handle">@ do Instagram</Label>
            <Input
              id="settings-instagram-handle"
              value={settings.profile.instagramHandle}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  profile: { ...settings.profile, instagramHandle: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-instagram-url">Link do Instagram</Label>
            <Input
              id="settings-instagram-url"
              value={settings.instagramUrl}
              onChange={(e) =>
                setSettings({ ...settings, instagramUrl: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-navy-950">
          CTAs principais
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-primary-cta-label">CTA principal — texto</Label>
            <Input
              id="settings-primary-cta-label"
              value={settings.primaryCta.label}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  primaryCta: { ...settings.primaryCta, label: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-primary-cta-href">CTA principal — link</Label>
            <Input
              id="settings-primary-cta-href"
              value={settings.primaryCta.href}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  primaryCta: { ...settings.primaryCta, href: e.target.value },
                })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-secondary-cta-label">CTA secundário — texto</Label>
            <Input
              id="settings-secondary-cta-label"
              value={settings.secondaryCta.label}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  secondaryCta: { ...settings.secondaryCta, label: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-secondary-cta-href">CTA secundário — link</Label>
            <Input
              id="settings-secondary-cta-href"
              value={settings.secondaryCta.href}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  secondaryCta: { ...settings.secondaryCta, href: e.target.value },
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Rodapé
        </h2>
        <div className="space-y-2">
          <Label htmlFor="settings-footer-note">Aviso do rodapé</Label>
          <Textarea
            id="settings-footer-note"
            rows={3}
            value={settings.footerNote}
            onChange={(e) => setSettings({ ...settings, footerNote: e.target.value })}
          />
        </div>
      </section>

      <div className="flex items-center gap-4 border-t border-border pt-6">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
        {saved && !isPending && (
          <p className="text-sm text-navy-700">Configurações salvas.</p>
        )}
      </div>
    </div>
  );
}
