'use client';

import type { Announcement } from 'generated/prisma';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { api } from '~/trpc/react';

export function DeleteAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
}: {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();

  const deleteMutation = api.announcement.delete.useMutation({
    onSuccess: () => {
      utils.announcement.get.invalidate();
      utils.announcement.getLive.invalidate();
    },
  });

  async function confirm() {
    try {
      await deleteMutation.mutateAsync({ id: announcement.id });
      toast.success('Duyuru silindi');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Duyuru silinirken bir hata oluştu');
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby="Duyuru silme onayı"
        className="sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>Duyuruyu sil</DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{announcement.title}</strong>{' '}
            adlı duyuruyu silmek istediğinize emin misiniz? Bu işlem geri
            alınamaz.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleteMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            İptal
          </Button>
          <Button
            disabled={deleteMutation.isPending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {deleteMutation.isPending ? 'Siliniyor...' : 'Evet, sil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
