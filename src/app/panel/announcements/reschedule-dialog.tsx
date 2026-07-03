'use client';

import type { Announcement } from 'generated/prisma';
import { XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { api } from '~/trpc/react';
import { addDays } from './datetime-local';
import { ScheduleDateTimePicker } from './schedule-datetime-picker';

export function RescheduleAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
}: {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset fields whenever the dialog is opened for a (possibly different) announcement
  useEffect(() => {
    if (open) {
      setStart(announcement.start);
      setEnd(announcement.end);
    }
  }, [open, announcement.id]);

  const rescheduleMutation = api.announcement.reschedule.useMutation({
    onSuccess: () => {
      utils.announcement.get.invalidate();
      utils.announcement.getLive.invalidate();
    },
  });

  async function save() {
    try {
      await rescheduleMutation.mutateAsync({
        id: announcement.id,
        start,
        end,
      });
      toast.success('Zamanlama güncellendi');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Zamanlama güncellenirken bir hata oluştu');
    }
  }

  const presets: [string, () => void][] = [
    ['Bugün başlat', () => setStart(new Date())],
    ['+7 gün', () => setEnd(addDays(new Date(), 7))],
    ['+30 gün', () => setEnd(addDays(new Date(), 30))],
  ];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby="Duyuru zamanlama formu"
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Zamanlamayı Değiştir</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="reschedule-start">
                Başlangıç
              </Label>
              <div className="flex items-center gap-1.5">
                <ScheduleDateTimePicker
                  className="flex-1"
                  id="reschedule-start"
                  onChange={setStart}
                  value={start}
                />
                <Button
                  disabled={!start}
                  onClick={() => setStart(null)}
                  size="icon"
                  title="Başlangıcı temizle"
                  type="button"
                  variant="ghost"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="reschedule-end">
                Bitiş
              </Label>
              <div className="flex items-center gap-1.5">
                <ScheduleDateTimePicker
                  className="flex-1"
                  id="reschedule-end"
                  onChange={setEnd}
                  value={end}
                />
                <Button
                  disabled={!end}
                  onClick={() => setEnd(null)}
                  size="icon"
                  title="Bitişi temizle"
                  type="button"
                  variant="ghost"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map(([label, apply]) => (
              <button
                className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted/70"
                key={label}
                onClick={apply}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Başlangıç ileri bir tarihse duyuru{' '}
            <strong className="text-foreground">Zamanlanmış</strong> olur; her
            ikisi de boşsa <strong className="text-foreground">Taslak</strong>{' '}
            olarak saklanır.
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Başlangıç tarihini/saatini değiştirmek, duyuruyu daha önce görmüş
            kullanıcılara bile{' '}
            <strong className="text-foreground">
              açılır pencereyi tekrar gösterir
            </strong>
            .
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            onClick={() => {
              setStart(null);
              setEnd(null);
            }}
            type="button"
            variant="ghost"
          >
            Zamanlamayı temizle
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button
                disabled={rescheduleMutation.isPending}
                type="button"
                variant="outline"
              >
                İptal
              </Button>
            </DialogClose>
            <Button
              className="cursor-pointer"
              disabled={rescheduleMutation.isPending}
              onClick={save}
              type="button"
            >
              {rescheduleMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
