"use client";

import type { DatasetColumn } from "@praedixa/shared-types";
import { DataTable, type DataTableColumn } from "@praedixa/ui";

const DTYPE_LABELS: Record<string, string> = {
  float: "Decimal",
  integer: "Entier",
  date: "Date",
  category: "Categorie",
  boolean: "Booleen",
  text: "Texte",
};

const ROLE_LABELS: Record<string, string> = {
  target: "Cible",
  feature: "Feature",
  temporal_index: "Index temporel",
  group_by: "Regroupement",
  id: "Identifiant",
  meta: "Metadonnee",
};

const columns: DataTableColumn<DatasetColumn>[] = [
  {
    key: "ordinalPosition",
    label: "#",
    align: "center",
    render: (row) => String(row.ordinalPosition),
  },
  { key: "name", label: "Nom", sortable: true },
  {
    key: "dtype",
    label: "Type",
    render: (row) => DTYPE_LABELS[row.dtype] ?? row.dtype,
  },
  {
    key: "role",
    label: "Role",
    render: (row) => ROLE_LABELS[row.role] ?? row.role,
  },
  {
    key: "nullable",
    label: "Nullable",
    align: "center",
    render: (row) => (row.nullable ? "Oui" : "Non"),
  },
];

interface ColumnMetadataTableProps {
  data: DatasetColumn[];
}

export function ColumnMetadataTable({ data }: ColumnMetadataTableProps) {
  return (
    <DataTable<DatasetColumn>
      columns={columns}
      data={data}
      getRowKey={(row) => row.id}
      emptyMessage="Aucune colonne definie"
    />
  );
}
