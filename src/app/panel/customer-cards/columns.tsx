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
import { labelCompose } from '~/shared/labels/compose';
import type { ResolvedLabels } from '~/shared/labels/types';

export type CustomerCardRow = CustomerCard & { isRestricted?: boolean };

export const createColumns = (
  labels: ResolvedLabels,
  onViewCustomerCard: (customerCard: CustomerCardRow) => void,
): ColumnDef<CustomerCardRow>[] => {
  const f = labels.field.customerCard;

  return [
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
              <DropdownMenuItem
                onClick={() => onViewCustomerCard(customerCard)}
              >
                {customerCard.isRestricted
                  ? labelCompose.view(labels.entity.customerCard)
                  : labelCompose.edit(labels.entity.customerCard)}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`/panel/visits?customerCardId=${customerCard.id}`}>
                  {labelCompose.nav(labels.entity.visit)}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: 'sira',
      header: f.sira,
      enableSorting: true,
    },
    {
      accessorKey: 'name',
      header: f.name,
      enableSorting: true,
    },
    {
      accessorKey: 'authorities',
      header: f.authorities,
      enableSorting: true,
    },
    {
      accessorKey: 'gsm1',
      header: f.gsm1,
      enableSorting: true,
    },
    {
      accessorKey: 'contact1',
      header: f.contact1,
      enableSorting: true,
    },
    {
      accessorKey: 'sicil',
      header: f.sicil,
      enableSorting: true,
    },
    {
      accessorKey: 'address',
      header: f.address,
      enableSorting: true,
    },
    {
      accessorKey: 'district',
      header: f.district,
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
      header: f.region,
      enableSorting: true,
    },
    {
      accessorKey: 'gsm2',
      header: f.gsm2,
      enableSorting: true,
    },
    {
      accessorKey: 'contact2',
      header: f.contact2,
      enableSorting: true,
    },
    {
      accessorKey: 'gsm3',
      header: f.gsm3,
      enableSorting: true,
    },
    {
      accessorKey: 'contact3',
      header: f.contact3,
      enableSorting: true,
    },
    {
      accessorKey: 'businessGroup',
      header: f.businessGroup,
      enableSorting: true,
    },
    {
      accessorKey: 'color',
      header: f.color,
      enableSorting: true,

      // using an accessorFn instead of the `cell` here so that excel exporting gets the display text and not the internal values
      accessorFn: ({ color }) => {
        return COLOR_DISPLAY_NAME_MAP[color] ?? '-';
      },
    },
    {
      accessorKey: 'status',
      header: f.status,
      enableSorting: true,
      cell: ({ row }) => {
        const s = row.getValue('status') as $Enums.Status;
        return s === 'geldi' ? 'Geldi' : s === 'gelmedi' ? 'Gelmedi' : '-';
      },
    },
    {
      accessorKey: 'authorizationDocument',
      header: f.authorizationDocument,
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
      header: f.vote,
      enableSorting: true,
      cell: ({ row }) => {
        const v = row.getValue('vote') as $Enums.Vote;
        return v === 'geldi' ? 'Geldi' : v === 'gelmedi' ? 'Gelmedi' : '-';
      },
    },
    {
      accessorKey: 'salesRepresentative',
      header: f.salesRepresentative,
      enableSorting: true,
    },
    {
      accessorKey: 'note',
      header: f.note,
      enableSorting: true,
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
    {
      accessorKey: 'updatedAt',
      header: labels.system.updatedAt,
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('updatedAt') as Date;
        return new Date(date).toLocaleDateString('tr-TR');
      },
    },
  ];
};
