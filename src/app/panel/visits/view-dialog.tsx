'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Visit } from 'generated/prisma';
import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { DatePicker } from '~/app/_components/date-picker';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { VisitCreateSchema } from '~/shared/zod-schemas/visit';
import { api } from '~/trpc/react';

const VIA_OPTIONS = [
  { value: 'phone', label: 'Telefon' },
  { value: 'inPerson', label: 'Yüzyüze' },
  { value: 'email', label: 'E-Posta' },
  { value: 'sms', label: 'SMS' },
] as const;

interface ViewVisitDialogProps {
  visit: Visit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (visit: Visit) => void;
}

export function ViewVisitDialog({
  visit,
  open,
  onOpenChange,
  onUpdate,
}: ViewVisitDialogProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const utils = api.useUtils();

  // Fetch all customer cards for the dropdown
  const { data: customerCardsData } = api.customerCard.get.useQuery({
    page: 1,
    itemsPerPage: 1000, // Get all customer cards
  });

  // Reset modes when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsEditMode(false);
      setShowDeleteConfirm(false);
    }
    onOpenChange(newOpen);
  };

  const constructDefaultValues = (visit: Visit) => {
    return {
      date: visit.date,
      time: visit.time ?? undefined,
      via: visit.via ?? undefined,
      note: visit.note ?? '',
      customerCardId: visit.customerCardId,
    };
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(VisitCreateSchema),
    defaultValues: constructDefaultValues(visit),
    mode: 'onChange',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: constructDefaultValues is a pure function
  useEffect(() => {
    reset(constructDefaultValues(visit));
  }, [visit, reset]);

  const updateMutation = api.visit.update.useMutation({
    onSuccess: (updatedVisit) => {
      utils.visit.get.invalidate();
      toast.success('Ziyaret başarıyla güncellendi');

      onUpdate?.(updatedVisit);
      setIsEditMode(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Ziyaret güncellenirken bir hata oluştu');
    },
  });

  const deleteMutation = api.visit.delete.useMutation({
    onSuccess: () => {
      utils.visit.get.invalidate();
      toast.success('Ziyaret başarıyla silindi');
      handleOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Ziyaret silinirken bir hata oluştu');
    },
  });

  const onSubmit = async (data: z.infer<typeof VisitCreateSchema>) => {
    await updateMutation.mutateAsync({
      id: visit.id,
      ...data,
    });

    reset();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: visit.id });
  };

  const handleCancel = () => {
    if (isEditMode) {
      setIsEditMode(false);
      reset();
    }
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
    }
  };

  // Get customer card name
  // @ts-expect-error - customerCard is included in the query
  const customerCardName = visit.customerCard?.name || 'Bilinmiyor';

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        aria-describedby="Ziyaret görüntüleme ve düzenleme"
        className="max-h-[99vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isEditMode ? 'Ziyareti Düzenle' : 'Ziyaret Detayı'}</span>
            <div className="flex gap-2">
              {!isEditMode && !showDeleteConfirm && (
                <>
                  <Button
                    className="cursor-pointer"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setIsEditMode(true);
                    }}
                    variant="outline"
                  >
                    <Edit />
                    Düzenle
                  </Button>
                  <Button
                    className="me-4 cursor-pointer"
                    onClick={() => {
                      setIsEditMode(false);
                      setShowDeleteConfirm(true);
                    }}
                    size="icon"
                    variant="destructive"
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          {!isEditMode && (
            <DialogDescription>
              Ziyaret bilgilerini görüntüleyin veya düzenleyin
            </DialogDescription>
          )}
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="space-y-4 py-4">
            <p className="text-center font-medium text-lg">
              Bu ziyareti silmek istediğinizden emin misiniz?
            </p>
            <p className="text-center text-muted-foreground text-sm">
              Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
              >
                İptal
              </Button>
              <Button
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
                variant="destructive"
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Evet, Sil'}
              </Button>
            </div>
          </div>
        ) : isEditMode ? (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Customer Card Selection */}
            <div className="space-y-2">
              <Label htmlFor="customerCardId">Müşteri Kartı *</Label>
              <Controller
                control={control}
                name="customerCardId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={errors.customerCardId ? 'border-red-500' : ''}
                      id="customerCardId"
                    >
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerCardsData?.data?.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name} - {card.gsm1 || 'GSM Yok'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerCardId && (
                <p className="text-red-500 text-sm">
                  {errors.customerCardId.message}
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Tarih *</Label>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <DatePicker
                      className={errors.date ? 'border-red-500' : ''}
                      id="date"
                      onChange={(date) => {
                        field.onChange(date);
                      }}
                      value={field.value}
                    />
                  )}
                />
                {errors.date && (
                  <p className="text-red-500 text-sm">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Saat *</Label>
                <Controller
                  control={control}
                  name="time"
                  render={({ field }) => (
                    <Input
                      className={errors.time ? 'border-red-500' : ''}
                      id="time"
                      onChange={(e) => {
                        const timeValue = e.target.value;
                        if (timeValue) {
                          // Create a UTC date with the selected time to avoid timezone conversion
                          const [hours, minutes] = timeValue.split(':');
                          const date = new Date();
                          date.setUTCHours(
                            parseInt(hours ?? '0', 10),
                            parseInt(minutes ?? '0', 10),
                            0,
                            0,
                          );
                          field.onChange(date);
                        }
                      }}
                      type="time"
                      value={
                        field.value
                          ? `${String(
                              new Date(field.value).getUTCHours(),
                            ).padStart(2, '0')}:${String(
                              new Date(field.value).getUTCMinutes(),
                            ).padStart(2, '0')}`
                          : ''
                      }
                    />
                  )}
                />
                {errors.time && (
                  <p className="text-red-500 text-sm">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* Via */}
            <div className="space-y-2">
              <Label htmlFor="via">İletişim Türü</Label>
              <Controller
                control={control}
                name="via"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? undefined}
                  >
                    <SelectTrigger className="w-full" id="via">
                      <SelectValue placeholder="İletişim türü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIA_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Not</Label>
              <Textarea
                {...register('note')}
                id="note"
                placeholder="Ziyaret hakkında notlar..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                disabled={updateMutation.isPending}
                onClick={handleCancel}
                type="button"
                variant="outline"
              >
                İptal
              </Button>
              <Button
                className="cursor-pointer"
                disabled={updateMutation.isPending}
                type="submit"
              >
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {/* View Mode - Display data */}
            <div>
              <Label className="text-muted-foreground">Müşteri</Label>
              <p className="font-medium text-sm">{customerCardName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Tarih</Label>
                <p className="text-sm">
                  {(() => {
                    const d = new Date(visit.date);
                    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(
                      d.getUTCMonth() + 1,
                    ).padStart(2, '0')}.${d.getUTCFullYear()}`;
                  })()}
                </p>
              </div>
              {visit.time && (
                <div>
                  <Label className="text-muted-foreground">Saat</Label>
                  <p className="text-sm">
                    {`${String(new Date(visit.time).getUTCHours()).padStart(
                      2,
                      '0',
                    )}:${String(new Date(visit.time).getUTCMinutes()).padStart(
                      2,
                      '0',
                    )}`}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">İletişim Türü</Label>
              <p className="text-sm">
                {visit.via
                  ? VIA_OPTIONS.find((opt) => opt.value === visit.via)?.label
                  : '-'}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Not</Label>
              <p className="text-sm">{visit.note || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">
                  Oluşturulma Tarihi
                </Label>
                <p className="text-sm">
                  {visit.createdAt.toLocaleString('tr-TR')}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Güncellenme Tarihi
                </Label>
                <p className="text-sm">
                  {visit.updatedAt.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Kapat
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
