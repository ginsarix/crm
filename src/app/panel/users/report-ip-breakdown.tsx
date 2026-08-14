'use client';

import { Globe, Monitor } from 'lucide-react';
import { UAParser } from 'ua-parser-js';
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
import {
  BrandIcon,
  getBrowserIcon,
  getOsIcon,
} from '../_components/brand-icon';

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
          <TableHead>Tarayıcı / İşletim Sistemi</TableHead>
          <TableHead>Giriş Sayısı</TableHead>
          <TableHead>Son Giriş</TableHead>
          <TableHead>Toplam Süre</TableHead>
          <TableHead>Eylem Sayısı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const { browser, os } = new UAParser(row.userAgent ?? '').getResult();

          return (
            <TableRow key={row.ipAddress}>
              <TableCell className="font-mono text-xs">
                {!row.ipAddress || row.ipAddress === 'unknown'
                  ? 'Bilinmiyor'
                  : row.ipAddress}
              </TableCell>
              <TableCell>
                {row.userAgent ? (
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 items-center gap-1.5">
                      <BrandIcon
                        className="size-4"
                        fallback={Globe}
                        icon={getBrowserIcon(browser.name)}
                      />
                      <BrandIcon
                        className="size-4"
                        fallback={Monitor}
                        icon={getOsIcon(os.name)}
                      />
                    </div>
                    <span className="text-sm">
                      {browser.name ?? 'Bilinmeyen tarayıcı'}
                      {os.name && ` · ${os.name}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
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
          );
        })}
      </TableBody>
    </Table>
  );
}
