'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Announcement } from 'generated/prisma';
import { ZapIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { computePublishNowWindow } from '~/lib/announcement-status';
import { api } from '~/trpc/react';

function fmtShort(date: Date) {
  return format(date, 'd MMM HH:mm', { locale: tr });
}

function durationLabel(ms: number) {
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} gün`);
  if (hours) parts.push(`${hours} saat`);
  if (minutes && !days) parts.push(`${minutes} dk`);
  return parts.length > 0 ? parts.join(' ') : '0 dk';
}

export function PublishNowDialog({
  announcement,
  open,
  onOpenChange,
}: {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();

  const publishMutation = api.announcement.publishNow.useMutation({
    onSuccess: () => {
      utils.announcement.get.invalidate();
      utils.announcement.getLive.invalidate();
    },
  });

  const preview = computePublishNowWindow(announcement);
  const hasDuration =
    announcement.start &&
    announcement.end &&
    announcement.end.getTime() - announcement.start.getTime() > 0;

  async function confirm() {
    try {
      await publishMutation.mutateAsync({ id: announcement.id });
      toast.success(`"${announcement.title}" mağazada yayınlandı`);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Duyuru yayınlanırken bir hata oluştu');
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby="Duyuru yayınlama onayı"
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Şimdi Yayınla</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            <strong className="text-foreground">{announcement.title}</strong>{' '}
            adlı duyuru <strong className="text-foreground">hemen</strong>{' '}
            yayına alınacak.{' '}
            {hasDuration
              ? 'Yayın süresi korunur, bitiş tarihi buna göre kaydırılır.'
              : 'Bitiş tarihi belirlenmediğinden süresiz yayında kalır.'}
          </p>

          <div className="space-y-2.5 rounded-md border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-widest">
                Başlangıç
              </span>
              <span className="font-mono font-semibold text-primary text-sm">
                {fmtShort(preview.start)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-widest">
                Bitiş
              </span>
              <span className="font-mono font-semibold text-sm">
                {preview.end ? fmtShort(preview.end) : 'Süresiz'}
              </span>
            </div>
            {hasDuration && announcement.start && announcement.end && (
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-widest">
                  Süre
                </span>
                <span className="font-mono text-muted-foreground text-sm">
                  {durationLabel(
                    announcement.end.getTime() - announcement.start.getTime(),
                  )}
                </span>
              </div>
            )}
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Başlangıç tarihini/saatini değiştirmek, duyuruyu daha önce görmüş
            kullanıcılara bile{' '}
            <strong className="text-foreground">
              açılır pencereyi tekrar gösterir
            </strong>
            .
          </p>
        </div>

        <DialogFooter>
          <Button
            disabled={publishMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            İptal
          </Button>
          <Button
            className="cursor-pointer"
            disabled={publishMutation.isPending}
            onClick={confirm}
            type="button"
          >
            <ZapIcon className="size-3.5" />
            {publishMutation.isPending ? 'Yayınlanıyor...' : 'Şimdi Yayınla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
