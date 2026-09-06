"use client";

import { useMemo, useState, useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadStatus, updateLeadNotes, deleteLead } from "@/lib/actions/leads";
import { formatDate } from "@/lib/utils/format-date";
import type { Lead, LeadOrigin, LeadStatus } from "@/lib/types";

const statusLabels: Record<LeadStatus, string> = {
  novo: "Novo",
  "em-contato": "Em contato",
  convertido: "Convertido",
  descartado: "Descartado",
};

const originLabels: Record<LeadOrigin, string> = {
  contato: "Contato",
  formacao: "Formação",
  palestra: "Palestra",
};

function toCsvValue(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

function downloadCsv(leads: Lead[]) {
  const header = [
    "Nome",
    "E-mail",
    "Telefone",
    "Profissão",
    "Interesse",
    "Mensagem",
    "Origem",
    "Status",
    "Observações",
    "Data",
  ];
  const rows = leads.map((lead) => [
    lead.name,
    lead.email,
    lead.phone,
    lead.profession,
    lead.interest,
    lead.message,
    originLabels[lead.origin],
    statusLabels[lead.status],
    lead.notes ?? "",
    formatDate(lead.createdAt),
  ]);
  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function LeadsManager({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(
    [...initialLeads].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | LeadStatus>("todos");
  const [originFilter, setOriginFilter] = useState<"todos" | LeadOrigin>("todos");
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesTerm =
        !term ||
        lead.name.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.interest.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "todos" || lead.status === statusFilter;
      const matchesOrigin = originFilter === "todos" || lead.origin === originFilter;
      return matchesTerm && matchesStatus && matchesOrigin;
    });
  }, [leads, search, statusFilter, originFilter]);

  function handleStatusChange(lead: Lead, status: LeadStatus) {
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status } : item))
    );
    startTransition(async () => {
      await updateLeadStatus(lead.id, status);
    });
  }

  function handleNotesBlur(lead: Lead, notes: string) {
    if (notes === (lead.notes ?? "")) return;
    startTransition(async () => {
      await updateLeadNotes(lead.id, notes);
    });
  }

  function handleDelete(lead: Lead) {
    startTransition(async () => {
      await deleteLead(lead.id);
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setDeleteTarget(null);
    });
  }

  const columns: DataTableColumn<Lead>[] = [
    {
      key: "name",
      header: "Nome",
      render: (row) => (
        <div>
          <p className="font-medium text-navy-950">{row.name}</p>
          <p className="text-xs text-gray-600">
            {row.email} · {row.phone}
          </p>
        </div>
      ),
    },
    { key: "interest", header: "Interesse", render: (row) => row.interest },
    { key: "origin", header: "Origem", render: (row) => originLabels[row.origin] },
    { key: "createdAt", header: "Data", render: (row) => formatDate(row.createdAt) },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={row.status}
          onChange={(e) => handleStatusChange(row, e.target.value as LeadStatus)}
          aria-label={`Status do lead ${row.name}`}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "notes",
      header: "Observações",
      render: (row) => (
        <Textarea
          defaultValue={row.notes ?? ""}
          onBlur={(e) => handleNotesBlur(row, e.target.value)}
          rows={1}
          className="min-w-48"
          placeholder="Sem observações"
          aria-label={`Observações internas sobre ${row.name}`}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {filtered.length} de {leads.length} lead{leads.length === 1 ? "" : "s"} exibido
          {filtered.length === 1 ? "" : "s"}.
        </p>
        <Button variant="outline" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou interesse..."
          className="max-w-xs"
          aria-label="Buscar leads"
        />
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "todos" | LeadStatus)}
          aria-label="Filtrar por status"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value as "todos" | LeadOrigin)}
          aria-label="Filtrar por origem"
        >
          <option value="todos">Todas as origens</option>
          {Object.entries(originLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            title="Nenhum lead encontrado"
            description="Ajuste a busca/filtro, ou aguarde novos envios pelos formulários do site público."
          />
        }
        rowActions={(row) => (
          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row)}>
            Excluir
          </Button>
        )}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir lead"
        description={`Tem certeza que deseja excluir o lead de "${deleteTarget?.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
