'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { formatDuration } from '~/lib/format-duration';

export interface UserReportRow {
  id: string;
  name: string;
  email: string;
  totalActiveSeconds: number;
  lastLoginAt: Date | null;
  loginCount: number;
  actionCount: number;
}

export const createReportColumns = (
  expandedUserId: string | null,
  onToggleExpand: (userId: string) => void,
  onOpenActions: (userId: string, userName: string) => void,
): ColumnDef<UserReportRow>[] => [
  {
    id: 'expand',
    size: 40,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        className="h-8 w-8 p-0"
        onClick={() => onToggleExpand(row.original.id)}
        size="icon-sm"
        variant="ghost"
      >
        <span className="sr-only">Oturumları Göster</span>
        {expandedUserId === row.original.id ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Ad',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-sm">{row.original.name}</span>
        <span className="text-muted-foreground text-xs">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'loginCount',
    header: 'Giriş Sayısı',
    enableSorting: true,
    cell: ({ row }) => row.original.loginCount,
  },
  {
    accessorKey: 'lastLoginAt',
    header: 'Son Giriş',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.original.lastLoginAt;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="flex flex-col">
          <span className="text-sm">
            {new Date(date).toLocaleDateString('tr-TR')}
          </span>
          <span className="text-muted-foreground text-xs">
            {new Date(date).toLocaleTimeString('tr-TR')}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalActiveSeconds',
    header: 'Toplam Süre',
    enableSorting: true,
    cell: ({ row }) => formatDuration(row.original.totalActiveSeconds),
  },
  {
    accessorKey: 'actionCount',
    header: 'Eylem Sayısı',
    enableSorting: true,
    cell: ({ row }) => (
      <Button
        className="h-auto px-0"
        onClick={() => onOpenActions(row.original.id, row.original.name)}
        variant="link"
      >
        {row.original.actionCount}
      </Button>
    ),
  },
];
