'use client';

import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { formatDuration } from '~/lib/format-duration';
import { api } from '~/trpc/react';

interface IpBreakdownTableProps {
  userId: string;
  userName: string;
  onOpenActions: (userId: string, userName: string, ipAddress: string) => void;
}

export function IpBreakdownTable({
  userId,
  userName,
  onOpenActions,
}: IpBreakdownTableProps) {
  const { data, isLoading } = api.userReport.getIpBreakdown.useQuery({
    userId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Henüz oturum verisi yok
      </div>
    );
  }

  return (
    <Table className="bg-muted/30">
      <TableHeader>
        <TableRow>
          <TableHead>IP Adresi</TableHead>
          <TableHead>Giriş Sayısı</TableHead>
          <TableHead>Son Giriş</TableHead>
          <TableHead>Toplam Süre</TableHead>
          <TableHead>Eylem Sayısı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.ipAddress}>
            <TableCell className="font-mono text-xs">
              {row.ipAddress === 'unknown' ? 'Bilinmiyor' : row.ipAddress}
            </TableCell>
            <TableCell>{row.loginCount}</TableCell>
            <TableCell>
              {row.lastLoginAt
                ? new Date(row.lastLoginAt).toLocaleString('tr-TR')
                : '-'}
            </TableCell>
            <TableCell>{formatDuration(row.activeSeconds)}</TableCell>
            <TableCell>
              <Button
                className="h-auto px-0"
                onClick={() => onOpenActions(userId, userName, row.ipAddress)}
                variant="link"
              >
                {row.actionCount}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
