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

type VisitWithCustomerCard = RouterOutputs['visit']['get']['data'][number];

const VIA_MAP = {
  phone: 'Telefon',
  inPerson: 'Yüzyüze',
  email: 'E-Posta',
  sms: 'SMS',
} as const;

export const createColumns = (
  onViewVisit: (visit: VisitWithCustomerCard) => void,
): ColumnDef<VisitWithCustomerCard>[] => [
  {
    id: 'actions',
    size: 60,
    enableResizing: false,
    cell: ({ row }) => {
      const visit = row.original;

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
            <DropdownMenuItem onClick={() => onViewVisit(visit)}>
              Ziyareti Görüntüle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: 'customerCard.name',
    header: 'Müşteri Ünvanı',
    enableSorting: false,
    cell: ({ row }) => {
      const name = row.original.customerCard?.name;
      return name || '-';
    },
  },
  {
    accessorKey: 'customerCard.gsm1',
    header: 'Müşteri GSM',
    enableSorting: false,
    cell: ({ row }) => {
      const gsm = row.original.customerCard?.gsm1;
      return gsm || '-';
    },
  },
  {
    accessorKey: 'date',
    header: 'Tarih',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue('date') as Date;
      const d = new Date(date);
      return `${String(d.getUTCDate()).padStart(2, '0')}.${String(
        d.getUTCMonth() + 1,
      ).padStart(2, '0')}.${d.getUTCFullYear()}`;
    },
  },
  {
    accessorKey: 'time',
    header: 'Saat',
    enableSorting: true,

    // using an accessorFn here instead of `cell` so that excel exporting gets the parsed time directly. if we dont do this, it tries to convert a time value to a full date and fails with: 01.01.1970
    accessorFn: ({ time }) => {
      return time
        ? `${String(time.getUTCHours()).padStart(2, '0')}:${String(
            time.getUTCMinutes(),
          ).padStart(2, '0')}`
        : '';
    },

    cell: ({ row }) => {
      const time = row.getValue('time');

      if (!time) return '-';

      return time;
    },
  },
  {
    accessorKey: 'via',
    header: 'İletişim Türü',
    enableSorting: true,
    accessorFn: ({ via }) => {
      return VIA_MAP[via!];
    },
  },
  {
    accessorKey: 'note',
    header: 'Not',
    enableSorting: true,
    cell: ({ row }) => {
      const note = row.getValue('note') as string | null;
      if (!note) return '-';
      return note.length > 50 ? `${note.substring(0, 50)}...` : note;
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
  {
    accessorKey: 'updatedAt',
    header: 'Güncellenme Tarihi',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue('updatedAt') as Date;
      return new Date(date).toLocaleDateString('tr-TR');
    },
  },
];
