'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { $Enums, CustomerCard } from 'generated/prisma';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  COLOR_DISPLAY_NAME_MAP,
  DISTRICTS_SELECT_MAP,
} from '~/shared/constants';

export type CustomerCardRow = CustomerCard & { isRestricted?: boolean };

export const createColumns = (
  onViewCustomerCard: (customerCard: CustomerCardRow) => void,
): ColumnDef<CustomerCardRow>[] => [
  {
    id: 'actions',
    size: 60,
    enableResizing: false,
    cell: ({ row }) => {
      const customerCard = row.original;

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
            <DropdownMenuItem onClick={() => onViewCustomerCard(customerCard)}>
              {customerCard.isRestricted
                ? 'Cari Kartı Görüntüle'
                : 'Cariyi Düzenle'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/panel/visits?customerCardId=${customerCard.id}`}>
                Ziyaretleri Görüntüle
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: 'sira',
    header: 'Sıra',
    enableSorting: true,
  },
  {
    accessorKey: 'name',
    header: 'Ünvan',
    enableSorting: true,
  },
  {
    accessorKey: 'authorities',
    header: 'Yetkililer',
    enableSorting: true,
  },
  {
    accessorKey: 'gsm1',
    header: 'GSM 1',
    enableSorting: true,
  },
  {
    accessorKey: 'contact1',
    header: 'İletişim 1',
    enableSorting: true,
  },
  {
    accessorKey: 'sicil',
    header: 'Sicil',
    enableSorting: true,
  },
  {
    accessorKey: 'address',
    header: 'Adres',
    enableSorting: true,
  },
  {
    accessorKey: 'district',
    header: 'İlçe',
    enableSorting: true,
    cell: ({ row }) => {
      const district = row.getValue('district') as $Enums.District;
      return district
        ? DISTRICTS_SELECT_MAP.find((d) => d.value === district)?.label
        : '-';
    },
  },
  {
    accessorKey: 'region',
    header: 'Bölge',
    enableSorting: true,
  },
  {
    accessorKey: 'gsm2',
    header: 'GSM 2',
    enableSorting: true,
  },
  {
    accessorKey: 'contact2',
    header: 'İletişim 2',
    enableSorting: true,
  },
  {
    accessorKey: 'gsm3',
    header: 'GSM 3',
    enableSorting: true,
  },
  {
    accessorKey: 'contact3',
    header: 'İletişim 3',
    enableSorting: true,
  },
  {
    accessorKey: 'businessGroup',
    header: 'Meslek Grubu',
    enableSorting: true,
  },
  {
    accessorKey: 'color',
    header: 'Renk',
    enableSorting: true,

    // using an accessorFn instead of the `cell` here so that excel exporting gets the display text and not the internal values
    accessorFn: ({ color }) => {
      return COLOR_DISPLAY_NAME_MAP[color] ?? '-';
    },
  },
  {
    accessorKey: 'status',
    header: 'Durum',
    enableSorting: true,
    cell: ({ row }) => {
      const s = row.getValue('status') as $Enums.Status;
      return s === 'geldi' ? 'Geldi' : s === 'gelmedi' ? 'Gelmedi' : '-';
    },
  },
  {
    accessorKey: 'authorizationDocument',
    header: 'Yetki Belge',
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.getValue(
        'authorizationDocument',
      ) as $Enums.AuthorizationDocument;
      return v === 'aldi' ? 'Aldı' : v === 'almadi' ? 'Almadı' : '-';
    },
  },
  {
    accessorKey: 'vote',
    header: 'Oy',
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.getValue('vote') as $Enums.Vote;
      return v === 'geldi' ? 'Geldi' : v === 'gelmedi' ? 'Gelmedi' : '-';
    },
  },
  {
    accessorKey: 'salesRepresentative',
    header: 'Satış Temsilcisi',
    enableSorting: true,
  },
  {
    accessorKey: 'note',
    header: 'Not',
    enableSorting: true,
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
