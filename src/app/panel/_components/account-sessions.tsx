'use client';

import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Globe, LogOut, Monitor } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { UAParser } from 'ua-parser-js';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { authClient } from '~/server/better-auth/client';
import { api } from '~/trpc/react';
import { BrandIcon, getBrowserIcon, getOsIcon } from './brand-icon';

export function AccountSessions() {
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokeAllConfirmOpen, setRevokeAllConfirmOpen] = useState(false);
  const { data: currentSession } = authClient.useSession();
  const utils = api.useUtils();
  const { data: sessions, isLoading } = api.user.listMySessions.useQuery();

  const handleRevoke = async (token: string) => {
    setRevokingToken(token);
    const { error } = await authClient.revokeSession({ token });
    if (error) {
      toast.error('Oturum sonlandırılamadı');
    } else {
      toast.success('Oturum sonlandırıldı');
      await utils.user.listMySessions.invalidate();
    }
    setRevokingToken(null);
  };

  const handleRevokeAllOthers = async () => {
    setRevokingAll(true);
    const { error } = await authClient.revokeOtherSessions();
    if (error) {
      toast.error('Oturumlar sonlandırılamadı');
    } else {
      toast.success('Diğer tüm oturumlar sonlandırıldı');
      await utils.user.listMySessions.invalidate();
    }
    setRevokingAll(false);
    setRevokeAllConfirmOpen(false);
  };

  const otherSessionsCount =
    sessions?.filter((s) => s.token !== currentSession?.session.token).length ??
    0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Aktif Oturumlar</h3>
        {otherSessionsCount > 0 && (
          <Button
            className="h-auto cursor-pointer gap-1 p-0 text-destructive hover:text-destructive"
            onClick={() => setRevokeAllConfirmOpen(true)}
            size="sm"
            variant="link"
          >
            <LogOut className="size-3.5" />
            Diğer tüm oturumlardan çıkış yap
          </Button>
        )}
      </div>

      {isLoading || !sessions ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {sessions.map((session) => {
            const isCurrent = session.token === currentSession?.session.token;
            const { browser, os } = new UAParser(
              session.userAgent ?? '',
            ).getResult();

            return (
              <div
                className="flex items-center justify-between gap-3 p-3"
                key={session.id}
              >
                <div className="flex min-w-0 items-center gap-3">
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm">
                        {browser.name ?? 'Bilinmeyen tarayıcı'}
                        {os.name && ` · ${os.name}`}
                      </p>
                      {isCurrent && (
                        <Badge className="shrink-0 gap-1" variant="secondary">
                          <span className="size-1.5 rounded-full bg-green-500" />
                          Bu Cihaz
                        </Badge>
                      )}
                    </div>
                    <p
                      className="truncate text-muted-foreground text-xs"
                      title={new Date(session.updatedAt).toLocaleString(
                        'tr-TR',
                      )}
                    >
                      {session.ipAddress ?? '—'} ·{' '}
                      {formatDistanceToNow(new Date(session.updatedAt), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </p>
                  </div>
                </div>
                {!isCurrent && (
                  <Button
                    className="shrink-0 cursor-pointer"
                    disabled={revokingToken === session.token}
                    onClick={() => handleRevoke(session.token)}
                    size="sm"
                    variant="outline"
                  >
                    Sonlandır
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        onOpenChange={setRevokeAllConfirmOpen}
        open={revokeAllConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diğer Oturumlardan Çıkış Yap</DialogTitle>
            <DialogDescription>
              Bu cihaz dışındaki {otherSessionsCount} oturum sonlandırılacak. Bu
              işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={revokingAll} variant="outline">
                İptal
              </Button>
            </DialogClose>
            <Button
              disabled={revokingAll}
              onClick={handleRevokeAllOthers}
              variant="destructive"
            >
              {revokingAll ? 'Sonlandırılıyor...' : 'Evet, Sonlandır'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
