'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { ResolvedLabels } from '~/shared/labels/types';
import type { ElectionResultCountKey } from '~/shared/zod-schemas/election-result';
import { electionResultCountKeys } from '~/shared/zod-schemas/election-result';
import type { RouterOutputs } from '~/trpc/types';

export type ElectionResultRow =
  RouterOutputs['electionResult']['get']['data'][number];

function countColumn(
  key: ElectionResultCountKey,
  header: string,
): ColumnDef<ElectionResultRow> {
  return {
    accessorKey: key,
    header,
    enableSorting: true,
    size: 80,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original[key]}</span>
    ),
  };
}

export const createColumns = (
  labels: ResolvedLabels,
): ColumnDef<ElectionResultRow>[] => {
  const f = labels.field.electionResult;

  return [
    {
      accessorKey: 'businessGroupName',
      header: f.businessGroupName,
      enableSorting: true,
    },
    ...electionResultCountKeys.map((key) => countColumn(key, f[key])),
  ];
};
