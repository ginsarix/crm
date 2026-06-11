'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { CustomerCard } from 'generated/prisma';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Combobox } from '~/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { createLocaleSorter } from '~/lib/utils';
import { authClient } from '~/server/better-auth/client';
import { CustomerCardCreateSchema } from '~/shared/zod-schemas/customer-card';
import { api } from '~/trpc/react';
import ColorControl from './color-control';

const DISTRICTS = [
  { value: 'merkez', label: 'MERKEZ' },
  { value: 'avanos', label: 'AVANOS' },
  { value: 'urgup', label: 'ÜRGÜP' },
  { value: 'hacibektas', label: 'HACIBEKTAŞ' },
  { value: 'kozakli', label: 'KOZAKLI' },
  { value: 'acigol', label: 'ACIGÖL' },
  { value: 'derinkuyu', label: 'DERİNKUYU' },
  { value: 'gulsehir', label: 'GÜLŞEHİR' },
] as const;

interface ViewCustomerCardDialogProps {
  customerCard: CustomerCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (customerCard: CustomerCard) => void;
}

export function ViewCustomerCardDialog({
  customerCard,
  open,
  onOpenChange,
  onUpdate,
}: ViewCustomerCardDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const utils = api.useUtils();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === 'admin';

  const { data: businessGroups } = api.businessGroup.get.useQuery();
  const { data: salesRepresentatives } = api.salesRepresentative.get.useQuery();

  const businessGroupOptions =
    businessGroups
      ?.map((bg) => ({ key: bg.name, label: bg.name }))
      .sort(createLocaleSorter('label')) ?? [];
  const salesRepresentativeOptions =
    salesRepresentatives?.map((sr) => ({ key: sr.name, label: sr.name })) ?? [];

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowDeleteConfirm(false);
    }
    onOpenChange(newOpen);
  };

  const constructDefaultValues = (customerCard: CustomerCard) => {
    return {
      sira: customerCard.sira ?? '',
      name: customerCard.name ?? '',
      sicil: customerCard.sicil ?? '',
      address: customerCard.address ?? '',
      district: customerCard.district ?? undefined,
      region: customerCard.region ?? '',
      gsm1: customerCard.gsm1 ?? '',
      contact1: customerCard.contact1 ?? '',
      gsm2: customerCard.gsm2 ?? '',
      contact2: customerCard.contact2 ?? '',
      gsm3: customerCard.gsm3 ?? '',
      contact3: customerCard.contact3 ?? '',
      businessGroup: customerCard.businessGroup ?? '',
      color: customerCard.color ?? 'gray',
      status: customerCard.status,
      authorizationDocument: customerCard.authorizationDocument,
      vote: customerCard.vote,
      authorities: customerCard.authorities ?? '',
      salesRepresentative: customerCard.salesRepresentative ?? '',
      note: customerCard.note ?? '',
    };
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(CustomerCardCreateSchema),
    defaultValues: constructDefaultValues(customerCard),
    mode: 'onChange',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: constructDefaultValues is a pure function
  useEffect(() => {
    reset(constructDefaultValues(customerCard));
  }, [customerCard, reset]);

  const updateMutation = api.customerCard.update.useMutation({
    onSuccess: (updatedCustomerCard) => {
      utils.customerCard.get.invalidate();
      toast.success('Cari kart başarıyla güncellendi');
      onUpdate(updatedCustomerCard);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Cari kart güncellenirken bir hata oluştu');
    },
  });

  const deleteMutation = api.customerCard.delete.useMutation({
    onSuccess: () => {
      utils.customerCard.get.invalidate();
      toast.success('Cari kart başarıyla silindi');
      handleOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Cari kart silinirken bir hata oluştu');
    },
  });

  const onSubmit = async (data: z.infer<typeof CustomerCardCreateSchema>) => {
    await updateMutation.mutateAsync({
      id: customerCard.id,
      ...data,
    });

    reset();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: customerCard.id });
  };

  const handleCancel = () => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
    } else {
      handleOpenChange(false);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        aria-describedby="Cari kart görüntüleme ve düzenleme"
        className="max-h-[99vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Cari Kartı Düzenle</span>
            {!showDeleteConfirm && isAdmin && (
              <Button
                className="me-4 cursor-pointer"
                onClick={() => setShowDeleteConfirm(true)}
                size="icon"
                variant="destructive"
              >
                <Trash2 />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="space-y-4 py-4">
            <p className="text-center font-medium text-lg">
              Bu cari kartı silmek istediğinizden emin misiniz?
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
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sira">Sıra</Label>
                <Input {...register('sira')} id="sira" placeholder="Sıra no" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Ünvan *</Label>
                <Input
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                  id="name"
                  placeholder="Ünvan"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sicil">Sicil</Label>
                <Input
                  {...register('sicil')}
                  id="sicil"
                  placeholder="Sicil no"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessGroup">Meslek Grubu</Label>
                <Controller
                  control={control}
                  name="businessGroup"
                  render={({ field }) => (
                    <Combobox
                      label="Meslek grubu seçin"
                      onChange={field.onChange}
                      options={businessGroupOptions}
                      selectedKey={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                {...register('address')}
                id="address"
                placeholder="Adres"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="district">İlçe</Label>
                <Controller
                  control={control}
                  name="district"
                  render={({ field }) => (
                    <Select
                      defaultValue={field.value ?? undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full" id="district">
                        <SelectValue placeholder="İlçe seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((district) => (
                          <SelectItem
                            key={district.value}
                            value={district.value}
                          >
                            {district.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Bölge</Label>
                <Input
                  {...register('region')}
                  id="region"
                  placeholder="Bölge"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3 rounded-lg border p-3">
              <h4 className="font-medium text-sm">İletişim Bilgileri</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gsm1">GSM 1</Label>
                  <Input {...register('gsm1')} id="gsm1" placeholder="GSM 1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact1">İletişim 1</Label>
                  <Input
                    {...register('contact1')}
                    id="contact1"
                    placeholder="İletişim kişisi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gsm2">GSM 2</Label>
                  <Input {...register('gsm2')} id="gsm2" placeholder="GSM 2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact2">İletişim 2</Label>
                  <Input
                    {...register('contact2')}
                    id="contact2"
                    placeholder="İletişim kişisi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gsm3">GSM 3</Label>
                  <Input {...register('gsm3')} id="gsm3" placeholder="GSM 3" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact3">İletişim 3</Label>
                  <Input
                    {...register('contact3')}
                    id="contact3"
                    placeholder="İletişim kişisi"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-2">
              <Label htmlFor="authorities">Yetkililer</Label>
              <Input
                {...register('authorities')}
                id="authorities"
                placeholder="Yetkililer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesRepresentative">Satış Temsilcisi</Label>
              <Controller
                control={control}
                name="salesRepresentative"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    label="Satış temsilcisi seçin"
                    onChange={field.onChange}
                    options={salesRepresentativeOptions}
                    selectedKey={field.value ?? ''}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === '__null__' ? null : v)
                    }
                    value={field.value ?? undefined}
                  >
                    <SelectTrigger className="w-full" id="status">
                      <SelectValue placeholder="Durum Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__null__">Boş</SelectItem>
                      <SelectItem value="geldi">Geldi</SelectItem>
                      <SelectItem value="gelmedi">Gelmedi</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorizationDocument">Yetki Belge</Label>
              <Controller
                control={control}
                name="authorizationDocument"
                render={({ field }) => (
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === '__null__' ? null : v)
                    }
                    value={field.value ?? undefined}
                  >
                    <SelectTrigger
                      className="w-full"
                      id="authorizationDocument"
                    >
                      <SelectValue placeholder="Durum Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__null__">Boş</SelectItem>
                      <SelectItem value="aldi">Aldı</SelectItem>
                      <SelectItem value="almadi">Almadı</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vote">Oy</Label>
              <Controller
                control={control}
                name="vote"
                render={({ field }) => (
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === '__null__' ? null : v)
                    }
                    value={field.value ?? undefined}
                  >
                    <SelectTrigger className="w-full" id="vote">
                      <SelectValue placeholder="Durum Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__null__">Boş</SelectItem>
                      <SelectItem value="geldi">Geldi</SelectItem>
                      <SelectItem value="gelmedi">Gelmedi</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className="cursor-pointer" htmlFor="color">
                Renk
              </Label>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <ColorControl
                    color={field.value ?? 'gray'}
                    id="color"
                    setColor={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Not</Label>
              <Textarea
                {...register('note')}
                id="note"
                placeholder="Not"
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
        )}
      </DialogContent>
    </Dialog>
  );
}
