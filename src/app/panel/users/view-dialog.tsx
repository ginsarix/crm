import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from 'generated/prisma';
import { Check, Edit, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
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
import { UserUpdateSchema } from '~/shared/zod-schemas/user';
import { api } from '~/trpc/react';

interface ViewUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (user: User) => void;
}

export function ViewUserDialog({
  user,
  open,
  onOpenChange,
  onUpdate,
}: ViewUserDialogProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const utils = api.useUtils();

  // Reset modes when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsEditMode(false);
      setShowDeleteConfirm(false);
    }
    onOpenChange(newOpen);
  };

  const constructDefaultValues = (user: User) => {
    return {
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
    };
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(UserUpdateSchema),
    defaultValues: constructDefaultValues(user),
    mode: 'onChange',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: constructDefaultValues is a pure function
  useEffect(() => {
    reset(constructDefaultValues(user));
  }, [user, reset]);

  const updateMutation = api.user.update.useMutation({
    onSuccess: (updatedUser) => {
      utils.user.get.invalidate();
      toast.success('Kullanıcı başarıyla güncellendi');

      onUpdate(updatedUser);
      setIsEditMode(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Kullanıcı güncellenirken bir hata oluştu');
    },
  });

  const deleteMutation = api.user.delete.useMutation({
    onSuccess: () => {
      utils.user.get.invalidate();
      toast.success('Kullanıcı başarıyla silindi');
      handleOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message || 'Kullanıcı silinirken bir hata oluştu');
    },
  });

  const onSubmit = async (data: z.infer<typeof UserUpdateSchema>) => {
    await updateMutation.mutateAsync({
      id: user.id,
      ...data,
    });

    reset();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: user.id });
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

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        aria-describedby="Kullanıcı görüntüleme ve düzenleme"
        className="max-h-[99vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {isEditMode ? 'Kullanıcıyı Düzenle' : 'Kullanıcı Detayı'}
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
              Kullanıcı bilgilerini görüntüleyin veya düzenleyin
            </DialogDescription>
          )}
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="space-y-4 py-4">
            <p className="text-center font-medium text-lg">
              Bu kullanıcıyı silmek istediğinizden emin misiniz?
            </p>
            <p className="text-center text-muted-foreground text-sm">
              Bu işlem geri alınamaz ve kullanıcı kalıcı olarak silinecektir.
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
            <div className="flex justify-center">
              <Avatar className="h-20 w-20">
                <AvatarImage alt={user.name} src={user.image ?? undefined} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
            </div>

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
              <Label htmlFor="password">Yeni Şifre</Label>
              <Input
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
                id="password"
                placeholder="Boş bırakılırsa değişmez"
                type="password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Şifreyi değiştirmek istemiyorsanız boş bırakın
              </p>
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
            <div className="flex justify-center">
              <Avatar className="h-20 w-20">
                <AvatarImage alt={user.name} src={user.image ?? undefined} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">
                  E-posta Doğrulandı
                </Label>
                <div className="mt-1">
                  {user.emailVerified ? (
                    <div className="flex items-center gap-1 text-green-500">
                      <Check className="h-4 w-4" />
                      <span>Evet</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-500">
                      <X className="h-4 w-4" />
                      <span>Hayır</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Kullanıcı ID</Label>
                <p className="mt-1 font-mono text-muted-foreground text-xs">
                  {user.id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Kayıt Tarihi</Label>
                <p className="text-sm">
                  {new Date(user.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Son Güncelleme</Label>
                <p className="text-sm">
                  {new Date(user.updatedAt).toLocaleString('tr-TR')}
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
