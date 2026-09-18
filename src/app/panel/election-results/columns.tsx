'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import type { ResolvedLabels } from '~/shared/labels/types';
import type {
  ElectionResultCountKey,
  ElectionResultFormValues,
  ElectionResultUpdateInput,
} from '~/shared/zod-schemas/election-result';
import { electionResultCountKeys } from '~/shared/zod-schemas/election-result';
import type { RouterOutputs } from '~/trpc/types';

export type ElectionResultRow =
  RouterOutputs['electionResult']['get']['data'][number];

export type EditingContext = {
  editingRowId: string | null;
  form: UseFormReturn<
    ElectionResultFormValues,
    unknown,
    ElectionResultUpdateInput
  >;
  isSaving: boolean;
  onEdit: (row: ElectionResultRow) => void;
  onCancel: () => void;
  onSave: () => void;
};

function countColumn(
  key: ElectionResultCountKey,
  header: string,
  editing: EditingContext,
): ColumnDef<ElectionResultRow> {
  return {
    accessorKey: key,
    header,
    enableSorting: true,
    size: 90,
    cell: ({ row }) => {
      if (row.original.id !== editing.editingRowId) {
        return <span className="tabular-nums">{row.original[key]}</span>;
      }

      return (
        <Controller
          control={editing.form.control}
          name={key}
          render={({ field, fieldState }) => (
            <Input
              className={cn(
                'h-8 w-20 tabular-nums',
                fieldState.error && 'ring-2 ring-destructive',
              )}
              inputMode="numeric"
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') editing.onCancel();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editing.onSave();
                }
              }}
              ref={field.ref}
              title={fieldState.error?.message}
              value={field.value === null ? '' : String(field.value ?? '')}
            />
          )}
        />
      );
    },
  };
}

export const createColumns = (
  labels: ResolvedLabels,
  editing: EditingContext,
): ColumnDef<ElectionResultRow>[] => {
  const f = labels.field.electionResult;

  return [
    {
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      size: 90,
      cell: ({ row }) => {
        const isEditing = row.original.id === editing.editingRowId;

        if (!isEditing) {
          return (
            <Button
              aria-label="Düzenle"
              onClick={() => editing.onEdit(row.original)}
              size="icon"
              variant="ghost"
            >
              <PencilIcon className="size-4" />
            </Button>
          );
        }

        return (
          <div className="flex gap-1">
            <Button
              aria-label="Kaydet"
              disabled={editing.isSaving}
              onClick={editing.onSave}
              size="icon"
              variant="ghost"
            >
              <CheckIcon className="size-4" />
            </Button>
            <Button
              aria-label="İptal"
              disabled={editing.isSaving}
              onClick={editing.onCancel}
              size="icon"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'businessGroupName',
      header: f.businessGroupName,
      enableSorting: true,
    },
    ...electionResultCountKeys.map((key) => countColumn(key, f[key], editing)),
  ];
};
