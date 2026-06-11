'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { User } from 'generated/prisma';
import { Check, MoreHorizontal, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
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
  onViewUser: (user: User) => void,
): ColumnDef<User>[] => [
  {
    id: 'actions',
    size: 60,
    enableResizing: false,
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8 p-0" variant="ghost">
              <span className="sr-only">Menüyü aç</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Eylemler
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.email)}
            >
              E-postayı Kopyala
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewUser(user)}>
              Kullanıcıyı Görüntüle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    id: 'avatar',
    size: 60,
    enableResizing: false,
    cell: ({ row }) => {
      const user = row.original;
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return (
        <Avatar className="h-8 w-8">
          <AvatarImage alt={user.name} src={user.image ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Ad',
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: 'E-posta',
    enableSorting: true,
  },
  {
    accessorKey: 'role',
    header: 'Rol',
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.getValue('role') as string;
      return (
        <Badge variant={r === 'Yönetici' ? 'default' : 'secondary'}>{r}</Badge>
      );
    },

    accessorFn: ({ role }) => {
      return role === 'admin' ? 'Yönetici' : 'Kullanıcı';
    },
  },
  {
    accessorKey: 'emailVerified',
    header: 'E-posta Doğrulandı',
    enableSorting: true,
    cell: ({ row }) => {
      const verified = row.getValue('emailVerified') as string;
      return verified === 'Evet' ? (
        <div className="flex items-center gap-1 text-green-500">
          <Check className="h-4 w-4" />
          <span>Evet</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-500">
          <X className="h-4 w-4" />
          <span>Hayır</span>
        </div>
      );
    },

    accessorFn: ({ emailVerified }) => {
      return emailVerified ? 'Evet' : 'Hayır';
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Kayıt Tarihi',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date;
      return new Date(date).toLocaleDateString('tr-TR');
    },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Son Güncelleme',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue('updatedAt') as Date;
      return new Date(date).toLocaleDateString('tr-TR');
    },
  },
];
