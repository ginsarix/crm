'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Announcement } from 'generated/prisma';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { AnnouncementBanner } from '~/components/announcement-banner';
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
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { AnnouncementEditSchema } from '~/shared/zod-schemas/announcement';
import { api } from '~/trpc/react';

type FormValues = z.infer<typeof AnnouncementEditSchema>;

export function EditAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
}: {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(AnnouncementEditSchema),
    mode: 'onChange',
    shouldFocusError: false,
    values: {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body ?? '',
    },
  });

  const updateMutation = api.announcement.update.useMutation({
    onSuccess: () => {
      utils.announcement.get.invalidate();
      utils.announcement.getLive.invalidate();
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Değişiklikler kaydedildi');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Duyuru güncellenirken bir hata oluştu');
    }
  };

  return (
    <Dialog
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      open={open}
    >
      <DialogContent
        aria-describedby="Duyuru düzenleme formu"
        className="max-h-[95vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Duyuruyu Düzenle</DialogTitle>
          <DialogDescription>Başlık ve metni güncelleyin.</DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <AnnouncementBanner
            imagePath={announcement.imagePath}
            title={announcement.title}
          />

          <div className="space-y-2">
            <Label htmlFor="edit-title">Başlık *</Label>
            <Input
              {...register('title')}
              className={errors.title ? 'border-red-500' : ''}
              id="edit-title"
            />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-body">Metin — isteğe bağlı</Label>
            <Textarea {...register('body')} id="edit-body" rows={3} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                disabled={updateMutation.isPending}
                type="button"
                variant="outline"
              >
                İptal
              </Button>
            </DialogClose>
            <Button
              className="cursor-pointer"
              disabled={updateMutation.isPending}
              type="submit"
            >
              {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
