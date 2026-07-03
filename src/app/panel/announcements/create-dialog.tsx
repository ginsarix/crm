'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { AnnouncementCreateSchema } from '~/shared/zod-schemas/announcement';
import { api } from '~/trpc/react';
import { ImageDropzone } from './image-dropzone';
import { ScheduleDateTimePicker } from './schedule-datetime-picker';

type FormValues = z.infer<typeof AnnouncementCreateSchema>;

export function CreateAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(AnnouncementCreateSchema),
    mode: 'onChange',
    shouldFocusError: false,
    defaultValues: {
      title: '',
      body: '',
      imagePath: '',
      publishNow: false,
      start: null,
      end: null,
    },
  });

  const imagePath = watch('imagePath');
  const publishNow = watch('publishNow');

  const createMutation = api.announcement.create.useMutation({
    onSuccess: () => {
      utils.announcement.get.invalidate();
      utils.announcement.getLive.invalidate();
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        imagePath: data.imagePath || null,
      });
      toast.success(
        data.publishNow ? `"${data.title}" yayınlandı` : 'Duyuru kaydedildi',
      );
      reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Duyuru kaydedilirken bir hata oluştu');
    }
  };

  return (
    <Dialog
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button className="cursor-pointer" type="button">
          <PlusIcon />
          Yeni Duyuru
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby="Duyuru ekleme formu"
        className="max-h-[95vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Yeni Duyuru</DialogTitle>
          <DialogDescription>
            Başlık ekleyin, isterseniz bir görsel yükleyin ve zamanlayın.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Görsel — isteğe bağlı</Label>
            <ImageDropzone
              imagePath={imagePath || null}
              onUploaded={(path) =>
                setValue('imagePath', path, { shouldValidate: true })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Başlık *</Label>
            <Input
              {...register('title')}
              className={errors.title ? 'border-red-500' : ''}
              id="title"
              placeholder="Duyuru başlığı..."
            />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Metin — isteğe bağlı</Label>
            <Textarea
              {...register('body')}
              id="body"
              placeholder="Duyuru açıklaması..."
              rows={3}
            />
          </div>

          <div className="space-y-3 rounded-md border bg-muted/40 p-4">
            <p className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-widest">
              Zamanlama Penceresi
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div
                className={
                  publishNow
                    ? 'pointer-events-none space-y-1.5 opacity-50'
                    : 'space-y-1.5'
                }
              >
                <Label className="text-xs" htmlFor="start">
                  Başlangıç
                </Label>
                <Controller
                  control={control}
                  name="start"
                  render={({ field }) => (
                    <div className="flex items-center gap-1.5">
                      <ScheduleDateTimePicker
                        className="flex-1"
                        id="start"
                        onChange={field.onChange}
                        value={field.value ?? null}
                      />
                      <Button
                        disabled={!field.value}
                        onClick={() => field.onChange(null)}
                        size="icon"
                        title="Başlangıcı temizle"
                        type="button"
                        variant="ghost"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="end">
                  Bitiş
                </Label>
                <Controller
                  control={control}
                  name="end"
                  render={({ field }) => (
                    <div className="flex items-center gap-1.5">
                      <ScheduleDateTimePicker
                        className="flex-1"
                        id="end"
                        onChange={field.onChange}
                        value={field.value ?? null}
                      />
                      <Button
                        disabled={!field.value}
                        onClick={() => field.onChange(null)}
                        size="icon"
                        title="Bitişi temizle"
                        type="button"
                        variant="ghost"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {publishNow
                ? 'Başlangıç anında yayınlanacak şekilde ayarlanır. Bitiş boş bırakılırsa süresiz yayınlanır.'
                : 'Boş bırakılırsa duyuru taslak olarak kaydedilir.'}
            </p>
          </div>

          <Controller
            control={control}
            name="publishNow"
            render={({ field }) => (
              <div className="flex items-center gap-2.5 text-sm">
                <Checkbox
                  checked={field.value}
                  id="publishNow"
                  onCheckedChange={(v) => field.onChange(!!v)}
                />
                <Label className="cursor-pointer" htmlFor="publishNow">
                  Kaydettikten sonra hemen yayınla
                </Label>
              </div>
            )}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button
                disabled={createMutation.isPending}
                type="button"
                variant="outline"
              >
                İptal
              </Button>
            </DialogClose>
            <Button
              className="cursor-pointer"
              disabled={createMutation.isPending}
              type="submit"
            >
              {createMutation.isPending ? 'Kaydediliyor...' : 'Duyuruyu Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
