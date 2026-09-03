'use client';

import { ChevronDown, ChevronRight, Globe, Info, Monitor } from 'lucide-react';
import { Fragment, useState } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { formatDuration } from '~/lib/format-duration';
import { api } from '~/trpc/react';
import {
  BrandIcon,
  getBrowserIcon,
  getOsIcon,
} from '../_components/brand-icon';

type OpenActionsTarget = { deviceId?: string | null; ipAddress?: string };

interface DeviceBreakdownTableProps {
  userId: string;
  userName: string;
  onOpenActions: (
    userId: string,
    userName: string,
    target: OpenActionsTarget,
  ) => void;
}

export function DeviceBreakdownTable({
  userId,
  userName,
  onOpenActions,
}: DeviceBreakdownTableProps) {
  // undefined = nothing expanded; a device's own deviceId (string or null
  // for the "unknown device" bucket) = that device's IP rows are shown.
  const [expandedDeviceId, setExpandedDeviceId] = useState<
    string | null | undefined
  >(undefined);

  const { data, isLoading } = api.userReport.getDeviceBreakdown.useQuery({
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
          <TableHead className="w-10" />
          <TableHead>Cihaz</TableHead>
          <TableHead>İlk Görülme</TableHead>
          <TableHead>Son Görülme</TableHead>
          <TableHead>Giriş Sayısı</TableHead>
          <TableHead>Toplam Süre</TableHead>
          <TableHead>Eylem Sayısı</TableHead>
          <TableHead>IP Sayısı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((device) => {
          const { browser, os } = new UAParser(
            device.lastUserAgent ?? '',
          ).getResult();
          const isExpanded = expandedDeviceId === device.deviceId;
          const rowKey = device.deviceId ?? 'unknown';

          return (
            <Fragment key={rowKey}>
              <TableRow>
                <TableCell>
                  <Button
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setExpandedDeviceId((current) =>
                        current === device.deviceId
                          ? undefined
                          : device.deviceId,
                      )
                    }
                    size="icon-sm"
                    variant="ghost"
                  >
                    <span className="sr-only">IP'leri Göster</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  {device.lastUserAgent ? (
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
                  ) : device.deviceId === null ? (
                    <span className="text-muted-foreground">
                      Bilinmeyen cihaz
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Tanınmayan cihaz ({device.deviceId.slice(0, 8)})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {device.firstSeenAt
                    ? new Date(device.firstSeenAt).toLocaleString('tr-TR')
                    : '-'}
                </TableCell>
                <TableCell>
                  {device.lastSeenAt
                    ? new Date(device.lastSeenAt).toLocaleString('tr-TR')
                    : '-'}
                </TableCell>
                <TableCell>{device.loginCount}</TableCell>
                <TableCell>{formatDuration(device.activeSeconds)}</TableCell>
                <TableCell>
                  <Button
                    className="h-auto px-0"
                    onClick={() =>
                      onOpenActions(userId, userName, {
                        deviceId: device.deviceId,
                      })
                    }
                    variant="link"
                  >
                    {device.actionCount}
                  </Button>
                </TableCell>
                <TableCell>{device.ipCount}</TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow>
                  <TableCell className="p-0" colSpan={8}>
                    <DeviceIpRows
                      deviceId={device.deviceId}
                      onOpenActions={(ip) =>
                        onOpenActions(userId, userName, {
                          deviceId: device.deviceId,
                          ipAddress: ip,
                        })
                      }
                      userId={userId}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

interface DeviceIpRowsProps {
  userId: string;
  deviceId: string | null;
  onOpenActions: (ipAddress: string) => void;
}

function DeviceIpRows({ userId, deviceId, onOpenActions }: DeviceIpRowsProps) {
  const { data, isLoading } = api.userReport.getDeviceIpBreakdown.useQuery({
    userId,
    deviceId,
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
    <Table className="bg-muted/60">
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
                  onClick={() => onOpenActions(row.ipAddress)}
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
