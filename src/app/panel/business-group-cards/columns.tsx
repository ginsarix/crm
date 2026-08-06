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
              row.meclisSayisi === 2 ? 'bg-muted dark:bg-muted-foreground/20' : undefined,
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
  onEditBusinessGroupCard: (row: BusinessGroupCardRow) => void,
): ColumnDef<BusinessGroupCardRow>[] => [
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
              Düzenle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: 'businessGroupName',
    header: 'Meslek Grubu',
    enableSorting: true,
  },
  {
    accessorKey: 'uyeSayisi',
    header: () => (
      <span className="block leading-tight">
        Üye
        <br />
        Sayısı
      </span>
    ),
    size: 40,
    enableSorting: false,
    cell: ({ row }) => row.original.uyeSayisi ?? '-',
  },
  {
    accessorKey: 'meclisSayisi',
    header: () => (
      <span className="block leading-tight">
        Meclis
        <br />
        Sayısı
      </span>
    ),
    size: 40,
    enableSorting: false,
    cell: ({ row }) => row.original.meclisSayisi ?? '-',
  },
  committeeFieldColumn('meclis1', 'Meclis 1'),
  committeeFieldColumn('meclis2', 'Meclis 2'),
  committeeFieldColumn('meclis3', 'Meclis 3'),
  committeeFieldColumn('baskan', 'Meslek Grubu Başkanı'),
  committeeFieldColumn('baskanYardimcisi', 'Meslek Grubu Başkan Yardımcısı'),
  committeeFieldColumn('uye1', 'Meslek Grubu Üye 1'),
  committeeFieldColumn('yedekUye1', 'Yedek Üye 1'),
  committeeFieldColumn('uye2', 'Meslek Grubu Üye 2'),
  committeeFieldColumn('uye3', 'Meslek Grubu Üye 3'),
  committeeFieldColumn('uye4', 'Meslek Grubu Üye 4'),
  committeeFieldColumn('uye5', 'Meslek Grubu Üye 5'),
  committeeFieldColumn('yedekUye2', 'Yedek Üye 2'),
  committeeFieldColumn('yedekUye3', 'Yedek Üye 3'),
  committeeFieldColumn('yedekUye4', 'Yedek Üye 4'),
  committeeFieldColumn('yedekUye5', 'Yedek Üye 5'),
  committeeFieldColumn('yedekUye6', 'Yedek Üye 6'),
  committeeFieldColumn('yedekUye7', 'Yedek Üye 7'),
  {
    accessorKey: 'updatedAt',
    header: 'Güncellenme Tarihi',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue('updatedAt') as Date;
      return new Date(date).toLocaleDateString('tr-TR');
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Oluşturulma Tarihi',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date;
      return new Date(date).toLocaleDateString('tr-TR');
    },
  },
];
