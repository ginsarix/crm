'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SalesRepresentative } from 'generated/prisma';
import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { api } from '~/trpc/react';

interface ViewSaleRepresentativeDialogProps {
  salesRepresentative: SalesRepresentative;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (salesRepresentative: SalesRepresentative) => void;
}

export function ViewSaleRepresentativeDialog({
  salesRepresentative,
  open,
  onOpenChange,
  onUpdate,
}: ViewSaleRepresentativeDialogProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const utils = api.useUtils();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsEditMode(false);
      setShowDeleteConfirm(false);
    }
    onOpenChange(newOpen);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, 'Satış temsilcisi adı zorunludur'),
      }),
    ),
    defaultValues: {
      name: salesRepresentative.name,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    reset({
      name: salesRepresentative.name,
    });
  }, [salesRepresentative, reset]);

  const updateMutation = api.salesRepresentative.update.useMutation({
    onSuccess: (updatedSalesRepresentative) => {
      utils.salesRepresentative.get.invalidate();
      toast.success('Satış temsilcisi başarıyla güncellendi');
      onUpdate(updatedSalesRepresentative);
      setIsEditMode(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Satış temsilcisi güncellenirken bir hata oluştu');
    },
  });

  const deleteMutation = api.salesRepresentative.delete.useMutation({
    onSuccess: () => {
      utils.salesRepresentative.get.invalidate();
      toast.success('Satış temsilcisi başarıyla silindi');
      handleOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Satış temsilcisi silinirken bir hata oluştu');
    },
  });

  const onSubmit = async (data: { name: string }) => {
    await updateMutation.mutateAsync({
      id: salesRepresentative.id,
      ...data,
    });

    reset();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: salesRepresentative.id });
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby="Satış temsilcisi görüntüleme ve düzenleme"
        className="max-h-[99vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {isEditMode
                ? 'Satış Temsilcisi Düzenle'
                : 'Satış Temsilcisi Detayı'}
            </span>
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
              Satış temsilcisi bilgilerini görüntüleyin veya düzenleyin
            </DialogDescription>
          )}
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="space-y-4 py-4">
            <p className="text-center font-medium text-lg">
              Bu satış temsilcisi silmek istediğinizden emin misiniz?
            </p>
            <p className="text-center text-muted-foreground text-sm">
              Bu işlem geri alınamaz ve tüm ilgili veriler silinecektir.
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
            <div className="space-y-2">
              <Label htmlFor="name">Satış temsilcisi adı *</Label>
              <Input
                className={errors.name ? 'border-red-500' : ''}
                id="name"
                placeholder="Satış temsilcisi adı"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name.message}</p>
              )}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">
                  Satış temsilcisi adı
                </Label>
                <p className="text-sm">{salesRepresentative.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">
                  Oluşturulma Tarihi
                </Label>
                <p className="text-sm">
                  {new Date(salesRepresentative.createdAt).toLocaleString(
                    'tr-TR',
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Güncellenme Tarihi
                </Label>
                <p className="text-sm">
                  {new Date(salesRepresentative.updatedAt).toLocaleString(
                    'tr-TR',
                  )}
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
