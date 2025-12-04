'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { CustomerCard } from 'generated/prisma';
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

export const createColumns = (
  onViewCustomerCard: (customerCard: CustomerCard) => void,
): ColumnDef<CustomerCard>[] => [
  {
    id: 'actions',
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
            <DropdownMenuLabel>Eylemler</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(customerCard.id)}
            >
              ID'yi Kopyala
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewCustomerCard(customerCard)}>
              Cariyi Görüntüle
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/panel/visits/${customerCard.id}`}>
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
  },
  {
    accessorKey: 'region',
    header: 'Bölge',
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
    accessorKey: 'salesRepresentative',
    header: 'Satış Temsilcisi',
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
