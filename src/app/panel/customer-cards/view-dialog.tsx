'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { useLabels } from '~/hooks/use-labels';
import { createLocaleSorter } from '~/lib/utils';
import { authClient } from '~/server/better-auth/client';
import { labelCompose } from '~/shared/labels/compose';
import { CustomerCardCreateSchema } from '~/shared/zod-schemas/customer-card';
import { api } from '~/trpc/react';
import ColorControl from './color-control';
import type { CustomerCardRow } from './columns';

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
  customerCard: CustomerCardRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (customerCard: CustomerCardRow) => void;
}

export function ViewCustomerCardDialog({
  customerCard,
  open,
  onOpenChange,
  onUpdate,
}: ViewCustomerCardDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const labels = useLabels();
  const f = labels.field.customerCard;
  const utils = api.useUtils();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === 'admin';
  const canEdit = isAdmin || !customerCard.isRestricted;

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

  const constructDefaultValues = (customerCard: CustomerCardRow) => {
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
      utils.customerCard.get.cancel();
      toast.success(
        `${labels.entity.customerCard.singular} başarıyla güncellendi`,
      );
      onUpdate(updatedCustomerCard);
      handleOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        `${labels.entity.customerCard.singular} güncellenirken bir hata oluştu`,
      );
    },
  });

  const deleteMutation = api.customerCard.delete.useMutation({
    onSuccess: () => {
      utils.customerCard.get.invalidate();
      toast.success(`${labels.entity.customerCard.singular} başarıyla silindi`);
      handleOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        `${labels.entity.customerCard.singular} silinirken bir hata oluştu`,
      );
    },
  });

  const onSubmit = async (data: z.infer<typeof CustomerCardCreateSchema>) => {
    if (!canEdit) return;

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
        aria-describedby={`${labels.entity.customerCard.singular} görüntüleme ve düzenleme`}
        className="max-h-[99vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {canEdit
                ? labelCompose.edit(labels.entity.customerCard)
                : labelCompose.view(labels.entity.customerCard)}
            </span>
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
            {/* The accusative suffix sits on the fixed noun "kaydını"
                rather than on the entity name, so labels.entity.customerCard.singular
                can be substituted in bare nominative and stay grammatical
                under any rename. */}
            <p className="text-center font-medium text-lg">
              Bu {labels.entity.customerCard.singular} kaydını silmek
              istediğinizden emin misiniz?
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
            <fieldset
              className="m-0 space-y-4 border-0 p-0"
              disabled={!canEdit}
            >
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sira">{f.sira}</Label>
                  <Input {...register('sira')} id="sira" placeholder={f.sira} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{f.name} *</Label>
                  <Input
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                    id="name"
                    placeholder={f.name}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sicil">{f.sicil}</Label>
                  <Input
                    {...register('sicil')}
                    id="sicil"
                    placeholder={f.sicil}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessGroup">{f.businessGroup}</Label>
                  <Controller
                    control={control}
                    name="businessGroup"
                    render={({ field }) => (
                      <Combobox
                        label={`${f.businessGroup} seçin`}
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
                <Label htmlFor="address">{f.address}</Label>
                <Input
                  {...register('address')}
                  id="address"
                  placeholder={f.address}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="district">{f.district}</Label>
                  <Controller
                    control={control}
                    name="district"
                    render={({ field }) => (
                      <Select
                        defaultValue={field.value ?? undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full" id="district">
                          <SelectValue placeholder={`${f.district} seçin`} />
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
                  <Label htmlFor="region">{f.region}</Label>
                  <Input
                    {...register('region')}
                    id="region"
                    placeholder={f.region}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 rounded-lg border p-3">
                <h4 className="font-medium text-sm">İletişim Bilgileri</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gsm1">{f.gsm1}</Label>
                    <Input
                      {...register('gsm1')}
                      id="gsm1"
                      placeholder={f.gsm1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact1">{f.contact1}</Label>
                    <Input
                      {...register('contact1')}
                      id="contact1"
                      placeholder={f.contact1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gsm2">{f.gsm2}</Label>
                    <Input
                      {...register('gsm2')}
                      id="gsm2"
                      placeholder={f.gsm2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact2">{f.contact2}</Label>
                    <Input
                      {...register('contact2')}
                      id="contact2"
                      placeholder={f.contact2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gsm3">{f.gsm3}</Label>
                    <Input
                      {...register('gsm3')}
                      id="gsm3"
                      placeholder={f.gsm3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact3">{f.contact3}</Label>
                    <Input
                      {...register('contact3')}
                      id="contact3"
                      placeholder={f.contact3}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-2">
                <Label htmlFor="authorities">{f.authorities}</Label>
                <Input
                  {...register('authorities')}
                  id="authorities"
                  placeholder={f.authorities}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesRepresentative">
                  {f.salesRepresentative}
                </Label>
                <Controller
                  control={control}
                  name="salesRepresentative"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      label={`${f.salesRepresentative} seçin`}
                      onChange={field.onChange}
                      options={salesRepresentativeOptions}
                      selectedKey={field.value ?? ''}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{f.status}</Label>
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
                        <SelectValue placeholder={`${f.status} Seçiniz`} />
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
                <Label htmlFor="authorizationDocument">
                  {f.authorizationDocument}
                </Label>
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
                        <SelectValue
                          placeholder={`${f.authorizationDocument} Seçiniz`}
                        />
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
                <Label htmlFor="vote">{f.vote}</Label>
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
                        <SelectValue placeholder={`${f.vote} Seçiniz`} />
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
                  {f.color}
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
                <Label htmlFor="note">{f.note}</Label>
                <Textarea
                  {...register('note')}
                  id="note"
                  placeholder={f.note}
                  rows={3}
                />
              </div>
            </fieldset>

            <DialogFooter>
              <Button
                disabled={updateMutation.isPending}
                onClick={handleCancel}
                type="button"
                variant="outline"
              >
                {canEdit ? 'İptal' : 'Kapat'}
              </Button>
              {canEdit && (
                <Button
                  className="cursor-pointer"
                  disabled={updateMutation.isPending}
                  type="submit"
                >
                  {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
