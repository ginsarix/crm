'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { api } from '~/trpc/react';

export function CreateSaleRepresentativeDialog() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

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
    mode: 'onChange',
    shouldFocusError: false,
  });

  const createMutation = api.salesRepresentative.create.useMutation({
    onSuccess: () => {
      utils.salesRepresentative.get.invalidate();
    },
  });

  const onSubmit = async (data: { name: string }) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Satış temsilcisi başarıyla eklendi');
      reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Satış temsilcisi eklenirken bir hata oluştu');
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer" size="icon">
          <PlusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby="Satış temsilcisi ekleme formu"
        className="max-h-[99vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Satış Temsilcisi Ekle</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="name">Satış temsilcisi adı *</Label>
            <Input
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
              id="name"
              placeholder="Satış temsilcisi adı"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>
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
              {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
