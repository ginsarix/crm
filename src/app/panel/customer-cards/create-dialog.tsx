'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Combobox } from '~/components/ui/combobox';
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
import { Textarea } from '~/components/ui/textarea';
import { useLabels } from '~/hooks/use-labels';
import { createLocaleSorter } from '~/lib/utils';
import { DISTRICTS_SELECT_MAP } from '~/shared/constants';
import { labelCompose } from '~/shared/labels/compose';
import { CustomerCardCreateSchema } from '~/shared/zod-schemas/customer-card';
import { api } from '~/trpc/react';
import ColorControl from './color-control';

export function CreateCustomerCardDialog() {
  const [open, setOpen] = useState(false);
  const labels = useLabels();
  const f = labels.field.customerCard;
  const utils = api.useUtils();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(CustomerCardCreateSchema),
    mode: 'onChange',
    defaultValues: {
      color: 'gray',
    },
    shouldFocusError: false,
  });

  const { data: businessGroups } = api.businessGroup.get.useQuery();
  const { data: salesRepresentatives } = api.salesRepresentative.get.useQuery();

  const businessGroupOptions =
    businessGroups
      ?.map((bg) => ({ key: bg.name, label: bg.name }))
      .sort(createLocaleSorter('label')) ?? [];
  const salesRepresentativeOptions =
    salesRepresentatives?.map((sr) => ({ key: sr.name, label: sr.name })) ?? [];

  const createMutation = api.customerCard.create.useMutation({
    onSuccess: () => {
      utils.customerCard.get.invalidate();
      utils.user.getMyAccount.invalidate();
      utils.user.getMyCustomerCards.invalidate();
    },
  });

  const onSubmit = async (data: z.infer<typeof CustomerCardCreateSchema>) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(`${labels.entity.customerCard.singular} başarıyla eklendi`);
      reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        `${labels.entity.customerCard.singular} eklenirken bir hata oluştu`,
      );
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
        aria-describedby={`${labels.entity.customerCard.singular} ekleme formu`}
        className="max-h-[99vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>
            {labelCompose.create(labels.entity.customerCard)}
          </DialogTitle>
          <DialogDescription>Tek zorunlu alan: {f.name}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
                <p className="text-red-500 text-sm">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sicil">{f.sicil}</Label>
              <Input {...register('sicil')} id="sicil" placeholder={f.sicil} />
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
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full" id="district">
                      <SelectValue placeholder={`${f.district} seçin`} />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRICTS_SELECT_MAP.map((district) => (
                        <SelectItem key={district.value} value={district.value}>
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
                <Input {...register('gsm1')} id="gsm1" placeholder={f.gsm1} />
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
                <Input {...register('gsm2')} id="gsm2" placeholder={f.gsm2} />
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
                <Input {...register('gsm3')} id="gsm3" placeholder={f.gsm3} />
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
            <Label htmlFor="salesRepresentative">{f.salesRepresentative}</Label>
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
                  <SelectTrigger className="w-full" id="authorizationDocument">
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
