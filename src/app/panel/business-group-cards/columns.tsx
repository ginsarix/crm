'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import type { RouterOutputs } from '~/trpc/types';

export type BusinessGroupCardRow =
  RouterOutputs['businessGroupCard']['get']['data'][number];

function committeeFieldColumn(
  key:
    | 'meclis1'
    | 'meclis2'
    | 'meclis3'
    | 'baskan'
    | 'baskanYardimcisi'
    | 'uye1'
    | 'uye2'
    | 'uye3'
    | 'yedekUye1'
    | 'yedekUye2',
  header: string,
): ColumnDef<BusinessGroupCardRow> {
  return {
    id: key,
    header,
    enableSorting: false,
    accessorFn: (row) => {
      const committee = row.committee as Record<string, string[]> | null;
      const values = committee?.[key] ?? [];
      return values.length > 0 ? values.join(', ') : '-';
    },
  };
}

export const createColumns = (
  onViewBusinessGroupCard: (row: BusinessGroupCardRow) => void,
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
              onClick={() => onViewBusinessGroupCard(businessGroupCard)}
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
  committeeFieldColumn('meclis1', 'Meclis 1'),
  committeeFieldColumn('baskan', 'Meslek Grubu Başkanı'),
  committeeFieldColumn('baskanYardimcisi', 'Meslek Grubu Başkan Yardımcısı'),
  committeeFieldColumn('uye1', 'Meslek Grubu Üye 1'),
  committeeFieldColumn('yedekUye1', 'Yedek Üye 1'),
  committeeFieldColumn('meclis2', 'Meclis 2'),
  committeeFieldColumn('meclis3', 'Meclis 3'),
  committeeFieldColumn('uye2', 'Meslek Grubu Üye 2'),
  committeeFieldColumn('uye3', 'Meslek Grubu Üye 3'),
  committeeFieldColumn('yedekUye2', 'Yedek Üye 2'),
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
