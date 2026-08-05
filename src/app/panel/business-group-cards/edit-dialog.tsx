'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { TagAutocomplete } from '~/components/ui/tag-autocomplete';
import type { Committee } from '~/shared/zod-schemas/business-group-card';
import {
  committeeFieldKeys,
  getDuplicateCommitteeNames,
} from '~/shared/zod-schemas/business-group-card';
import { api } from '~/trpc/react';
import type { BusinessGroupCardRow } from './columns';

const FIELD_GROUPS: { title: string; fields: (keyof Committee)[] }[] = [
  { title: 'Meclis', fields: ['meclis1', 'meclis2', 'meclis3'] },
  {
    title: 'Yönetim',
    fields: ['baskan', 'baskanYardimcisi'],
  },
  { title: 'Üyeler', fields: ['uye1', 'uye2', 'uye3', 'uye4', 'uye5'] },
  {
    title: 'Yedek Üyeler',
    fields: ['yedekUye1', 'yedekUye2', 'yedekUye3', 'yedekUye4', 'yedekUye5'],
  },
];

const FIELD_LABELS: Record<keyof Committee, string> = {
  meclis1: 'Meclis 1',
  meclis2: 'Meclis 2',
  meclis3: 'Meclis 3',
  baskan: 'Meslek Grubu Başkanı',
  baskanYardimcisi: 'Meslek Grubu Başkan Yardımcısı',
  uye1: 'Meslek Grubu Üye 1',
  uye2: 'Meslek Grubu Üye 2',
  uye3: 'Meslek Grubu Üye 3',
  uye4: 'Meslek Grubu Üye 4',
  uye5: 'Meslek Grubu Üye 5',
  yedekUye1: 'Yedek Üye 1',
  yedekUye2: 'Yedek Üye 2',
  yedekUye3: 'Yedek Üye 3',
  yedekUye4: 'Yedek Üye 4',
  yedekUye5: 'Yedek Üye 5',
};

function toCommittee(row: BusinessGroupCardRow): Committee {
  const committee = (row.committee as Record<string, string[]> | null) ?? {};
  const result = {} as Committee;
  for (const key of committeeFieldKeys) {
    result[key] = committee[key] ?? [];
  }
  return result;
}

interface EditBusinessGroupCardDialogProps {
  businessGroupCard: BusinessGroupCardRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (row: BusinessGroupCardRow) => void;
}

export function EditBusinessGroupCardDialog({
  businessGroupCard,
  open,
  onOpenChange,
  onUpdate,
}: EditBusinessGroupCardDialogProps) {
  const utils = api.useUtils();
  const { data: salesRepresentatives } = api.salesRepresentative.get.useQuery();
  const suggestions = salesRepresentatives?.map((sr) => sr.name) ?? [];

  const [committee, setCommittee] = useState<Committee>(() =>
    toCommittee(businessGroupCard),
  );

  useEffect(() => {
    setCommittee(toCommittee(businessGroupCard));
  }, [businessGroupCard]);

  const duplicateNames = useMemo(
    () => getDuplicateCommitteeNames(committee),
    [committee],
  );

  const updateMutation = api.businessGroupCard.update.useMutation({
    onSuccess: (updated) => {
      utils.businessGroupCard.get.cancel();
      toast.success('Meslek grubu kartı başarıyla güncellendi');
      onUpdate(updated);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Meslek grubu kartı güncellenirken bir hata oluştu');
    },
  });

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      id: businessGroupCard.id,
      committee,
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby="Meslek grubu kartı düzenleme"
        className="max-h-[99vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>
            {businessGroupCard.businessGroupName} — Meslek Grubu Kartı
          </DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          Alanlara isim yazıp Enter’a veya artı butonuna basarak
          ekleyebilirsiniz. Satış temsilcileri listesinde olmayan isimler de
          girilebilir.
        </p>

        <div className="space-y-4">
          {FIELD_GROUPS.map((group) => (
            <div className="space-y-3 rounded-lg border p-3" key={group.title}>
              <h4 className="font-medium text-sm">{group.title}</h4>
              {group.fields.map((field) => (
                <div className="space-y-2" key={field}>
                  <Label htmlFor={field}>{FIELD_LABELS[field]}</Label>
                  <TagAutocomplete
                    duplicateValues={duplicateNames}
                    id={field}
                    onChange={(values) =>
                      setCommittee((prev) => ({ ...prev, [field]: values }))
                    }
                    suggestions={suggestions}
                    values={committee[field] ?? []}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            disabled={updateMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            İptal
          </Button>
          <Button
            className="cursor-pointer"
            disabled={updateMutation.isPending}
            onClick={handleSubmit}
            type="button"
          >
            {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
