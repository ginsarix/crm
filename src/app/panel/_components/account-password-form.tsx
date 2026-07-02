'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { UserChangePasswordSchema } from '~/shared/zod-schemas/user';
import { api } from '~/trpc/react';

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export function AccountPasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(UserChangePasswordSchema),
    mode: 'onChange',
    shouldFocusError: false,
  });

  const changePasswordMutation = api.user.changeMyPassword.useMutation();

  const onSubmit = async (data: FormValues) => {
    try {
      await changePasswordMutation.mutateAsync(data);
      toast.success('Şifre başarıyla değiştirildi');
      reset();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Şifre değiştirilemedi',
      );
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <h3 className="font-semibold text-sm">Şifre Değiştir</h3>
      <div className="space-y-2">
        <Label htmlFor="current-password">Mevcut Şifre</Label>
        <Input
          {...register('currentPassword')}
          className={errors.currentPassword ? 'border-red-500' : ''}
          id="current-password"
          type="password"
        />
        {errors.currentPassword && (
          <p className="text-red-500 text-sm">
            {errors.currentPassword.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">Yeni Şifre</Label>
        <Input
          {...register('newPassword')}
          className={errors.newPassword ? 'border-red-500' : ''}
          id="new-password"
          type="password"
        />
        {errors.newPassword && (
          <p className="text-red-500 text-sm">{errors.newPassword.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">Yeni Şifre (Tekrar)</Label>
        <Input
          {...register('confirmNewPassword')}
          className={errors.confirmNewPassword ? 'border-red-500' : ''}
          id="confirm-new-password"
          type="password"
        />
        {errors.confirmNewPassword && (
          <p className="text-red-500 text-sm">
            {errors.confirmNewPassword.message}
          </p>
        )}
      </div>
      <Button
        className="cursor-pointer"
        disabled={changePasswordMutation.isPending}
        size="sm"
        type="submit"
      >
        {changePasswordMutation.isPending
          ? 'Değiştiriliyor...'
          : 'Şifreyi Değiştir'}
      </Button>
    </form>
  );
}
