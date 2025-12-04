import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { CustomerCardCreateSchema } from '~/shared/zod-schemas/customer-card';
import { api } from '~/trpc/react';
import PositiveControl from './positive-control';

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

export function CreateCustomerCardDialog() {
  const [open, setOpen] = useState(false);
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
      positive: 'neutral',
    },
    shouldFocusError: false,
  });

  const createMutation = api.customerCard.create.useMutation({
    onSuccess: () => {
      utils.customerCard.get.invalidate();
    },
  });

  const onSubmit = async (data: z.infer<typeof CustomerCardCreateSchema>) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Cari kart başarıyla eklendi');
      reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Cari kart eklenirken bir hata oluştu');
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
        aria-describedby="Cari kart ekleme formu"
        className="max-h-[99vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Cari Kart Ekle</DialogTitle>
          <DialogDescription>Tek zorunlu Adı'dır</DialogDescription>
        </DialogHeader>

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
              <Input {...register('sicil')} id="sicil" placeholder="Sicil no" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessGroup">Meslek Grubu</Label>
              <Input
                {...register('businessGroup')}
                id="businessGroup"
                placeholder="Meslek grubu"
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input {...register('address')} id="address" placeholder="Adres" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="district">İlçe</Label>
              <Controller
                control={control}
                name="district"
                render={({ field }) => (
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full" id="district">
                      <SelectValue placeholder="İlçe seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRICTS.map((district) => (
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
              <Label htmlFor="region">Bölge</Label>
              <Input {...register('region')} id="region" placeholder="Bölge" />
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
            <Label htmlFor="salesRepresentative">Satış Temsilcisi</Label>
            <Input
              {...register('salesRepresentative')}
              id="salesRepresentative"
              placeholder="Satış temsilcisi"
            />
          </div>

          <div className="space-y-2">
            <Label className="cursor-pointer" htmlFor="positive">
              Pozitif
            </Label>
            <Controller
              control={control}
              name="positive"
              render={({ field }) => (
                <PositiveControl
                  id="positive"
                  positive={field.value ?? 'neutral'}
                  setPositive={field.onChange}
                />
              )}
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
