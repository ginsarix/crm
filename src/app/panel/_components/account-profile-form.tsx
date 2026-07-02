'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient } from '~/server/better-auth/client';
import { UserSelfUpdateSchema } from '~/shared/zod-schemas/user';
import { api } from '~/trpc/react';

interface AccountProfileFormProps {
  name: string;
}

export function AccountProfileForm({ name }: AccountProfileFormProps) {
  const utils = api.useUtils();
  const { refetch: refetchSession } = authClient.useSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(UserSelfUpdateSchema),
    mode: 'onChange',
    shouldFocusError: false,
    values: { name },
  });

  const updateMutation = api.user.updateMyProfile.useMutation({
    onSuccess: () => {
      utils.user.getMyAccount.invalidate();
      // better-auth caches session data in a signed cookie for 5 minutes
      // (see session.cookieCache in config.ts) — without disableCookieCache
      // this would just hand back the stale cached name.
      refetchSession({ query: { disableCookieCache: true } });
    },
  });

  const onSubmit = async (data: { name: string }) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Profil güncellendi');
    } catch (error) {
      console.error(error);
      toast.error('Profil güncellenirken bir hata oluştu');
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <h3 className="font-semibold text-sm">Profil</h3>
      <div className="space-y-2">
        <Label htmlFor="account-name">Ad Soyad</Label>
        <Input
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
          id="account-name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>
      <Button
        className="cursor-pointer"
        disabled={!isDirty || updateMutation.isPending}
        size="sm"
        type="submit"
      >
        {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </form>
  );
}
