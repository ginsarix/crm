'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Fragment } from 'react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import { labelCompose } from '~/shared/labels/compose';
import type { ResolvedLabels } from '~/shared/labels/types';
import type { CommitteeFieldKey } from '~/shared/zod-schemas/business-group-card';
import { getDuplicateCommitteeNames } from '~/shared/zod-schemas/business-group-card';
import type { RouterOutputs } from '~/trpc/types';

export type BusinessGroupCardRow =
  RouterOutputs['businessGroupCard']['get']['data'][number];

function committeeFieldColumn(
  key: CommitteeFieldKey,
  header: string,
): ColumnDef<BusinessGroupCardRow> {
  return {
    id: key,
    header,
    enableSorting: false,
    meta:
      key === 'meclis3'
        ? {
            cellClassName: (row) =>
              row.meclisSayisi === 2
                ? 'bg-muted dark:bg-muted-foreground/20'
                : undefined,
          }
        : undefined,
    accessorFn: (row) => {
      const committee = row.committee as Record<string, string[]> | null;
      const values = committee?.[key] ?? [];
      return values.length > 0 ? values.join(', ') : '-';
    },
    cell: ({ row }) => {
      const committee = row.original.committee as Record<
        string,
        string[]
      > | null;
      const values = committee?.[key] ?? [];
      const isGreyedOut = key === 'meclis3' && row.original.meclisSayisi === 2;
      if (values.length === 0) return isGreyedOut ? '' : '-';

      const duplicateNames = getDuplicateCommitteeNames(committee);
      return values.map((value, index) => (
        <Fragment key={value}>
          {index > 0 && ', '}
          <span
            className={cn(
              duplicateNames.has(value) &&
                'font-medium text-purple-600 dark:text-purple-400',
            )}
          >
            {value}
          </span>
        </Fragment>
      ));
    },
  };
}

export const createColumns = (
  labels: ResolvedLabels,
  onEditBusinessGroupCard: (row: BusinessGroupCardRow) => void,
): ColumnDef<BusinessGroupCardRow>[] => {
  const f = labels.field.businessGroupCard;

  return [
    {
      id: 'actions',
      size: 60,
      enableResizing: false,
      cell: ({ row }) => {
        const businessGroupCard = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8 p-0" variant="ghost">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Eylemler
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onEditBusinessGroupCard(businessGroupCard)}
              >
                {labelCompose.edit(labels.entity.businessGroupCard)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: 'businessGroupName',
      header: f.businessGroupName,
      enableSorting: true,
    },
    {
      accessorKey: 'uyeSayisi',
      header: f.uyeSayisi,
      size: 40,
      enableSorting: false,
      cell: ({ row }) => row.original.uyeSayisi ?? '-',
    },
    {
      accessorKey: 'meclisSayisi',
      header: f.meclisSayisi,
      size: 40,
      enableSorting: false,
      cell: ({ row }) => row.original.meclisSayisi ?? '-',
    },
    committeeFieldColumn('meclis1', f.meclis1),
    committeeFieldColumn('meclis2', f.meclis2),
    committeeFieldColumn('meclis3', f.meclis3),
    committeeFieldColumn('baskan', f.baskan),
    committeeFieldColumn('baskanYardimcisi', f.baskanYardimcisi),
    committeeFieldColumn('uye1', f.uye1),
    committeeFieldColumn('uye2', f.uye2),
    committeeFieldColumn('uye3', f.uye3),
    committeeFieldColumn('uye4', f.uye4),
    committeeFieldColumn('uye5', f.uye5),
    committeeFieldColumn('yedekUye1', f.yedekUye1),
    committeeFieldColumn('yedekUye2', f.yedekUye2),
    committeeFieldColumn('yedekUye3', f.yedekUye3),
    committeeFieldColumn('yedekUye4', f.yedekUye4),
    committeeFieldColumn('yedekUye5', f.yedekUye5),
    committeeFieldColumn('yedekUye6', f.yedekUye6),
    committeeFieldColumn('yedekUye7', f.yedekUye7),
    {
      accessorKey: 'updatedAt',
      header: labels.system.updatedAt,
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('updatedAt') as Date;
        return new Date(date).toLocaleDateString('tr-TR');
      },
    },
    {
      accessorKey: 'createdAt',
      header: labels.system.createdAt,
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date;
        return new Date(date).toLocaleDateString('tr-TR');
      },
    },
  ];
};
