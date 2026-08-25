"use client";

import { useState, useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadStatus, updateLeadNotes } from "@/lib/actions/leads";
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

export function LeadsManager({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(
    [...initialLeads].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  );
  const [, startTransition] = useTransition();

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
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {leads.length} lead{leads.length === 1 ? "" : "s"} recebido
        {leads.length === 1 ? "" : "s"}.
      </p>
      <DataTable
        columns={columns}
        rows={leads}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            title="Nenhum lead recebido ainda"
            description="Leads enviados pelos formulários do site público aparecem aqui."
          />
        }
      />
    </div>
  );
}
