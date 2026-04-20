'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '~/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { UserCreateSchema } from '~/shared/zod-schemas/user';
import { api } from '~/trpc/react';

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(UserCreateSchema),
    defaultValues: { name: '', email: '', password: '', role: 'user' as const },
    mode: 'onChange',
    shouldFocusError: false,
  });

  const role = watch('role');

  const createMutation = api.user.create.useMutation({
    onSuccess: () => {
      utils.user.get.invalidate();
    },
  });

  const onSubmit = async (data: z.infer<typeof UserCreateSchema>) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Kullanıcı başarıyla eklendi');
      reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Kullanıcı eklenirken bir hata oluştu');
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
        aria-describedby="Kullanıcı ekleme formu"
        className="max-h-[99vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Kullanıcı Ekle</DialogTitle>
          <DialogDescription>
            Yeni bir kullanıcı hesabı oluşturun
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="name">Ad *</Label>
            <Input
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
              id="name"
              placeholder="Kullanıcı adı"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-posta *</Label>
            <Input
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
              id="email"
              placeholder="E-posta adresi"
              type="email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifre *</Label>
            <Input
              {...register('password')}
              className={errors.password ? 'border-red-500' : ''}
              id="password"
              placeholder="En az 8 karakter"
              type="password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select
              onValueChange={(v) =>
                setValue('role', v as 'admin' | 'user', {
                  shouldValidate: true,
                })
              }
              value={role}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Rol seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Kullanıcı</SelectItem>
                <SelectItem value="admin">Yönetici</SelectItem>
              </SelectContent>
            </Select>
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
