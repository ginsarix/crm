'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
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
import { TagAutocomplete } from '~/components/ui/tag-autocomplete';
import { useLabels } from '~/hooks/use-labels';
import type { SectionKey } from '~/shared/labels/types';
import type { Committee } from '~/shared/zod-schemas/business-group-card';
import {
  committeeFieldKeys,
  getDuplicateCommitteeNames,
} from '~/shared/zod-schemas/business-group-card';
import { api } from '~/trpc/react';
import type { BusinessGroupCardRow } from './columns';

const FIELD_GROUPS: { key: SectionKey; fields: (keyof Committee)[] }[] = [
  { key: 'meclis', fields: ['meclis1', 'meclis2', 'meclis3'] },
  { key: 'komite', fields: ['baskan', 'baskanYardimcisi', 'uye1', 'uye2'] },
  { key: 'meclisYedek', fields: ['uye3', 'uye4', 'uye5'] },
  {
    key: 'komiteYedek',
    fields: ['yedekUye1', 'yedekUye2', 'yedekUye3', 'yedekUye4'],
  },
  { key: 'yedekUyeler', fields: ['yedekUye5', 'yedekUye6', 'yedekUye7'] },
];

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
  const labels = useLabels();
  const f = labels.field.businessGroupCard;
  const utils = api.useUtils();
  const { data: salesRepresentatives } = api.salesRepresentative.get.useQuery();
  const suggestions = salesRepresentatives?.map((sr) => sr.name) ?? [];

  const [committee, setCommittee] = useState<Committee>(() =>
    toCommittee(businessGroupCard),
  );
  const [uyeSayisi, setUyeSayisi] = useState(businessGroupCard.uyeSayisi ?? '');
  const [meclisSayisi, setMeclisSayisi] = useState<2 | 3 | undefined>(
    (businessGroupCard.meclisSayisi as 2 | 3 | null) ?? undefined,
  );

  useEffect(() => {
    setCommittee(toCommittee(businessGroupCard));
    setUyeSayisi(businessGroupCard.uyeSayisi ?? '');
    setMeclisSayisi(
      (businessGroupCard.meclisSayisi as 2 | 3 | null) ?? undefined,
    );
  }, [businessGroupCard]);

  const duplicateNames = useMemo(
    () => getDuplicateCommitteeNames(committee),
    [committee],
  );

  const updateMutation = api.businessGroupCard.update.useMutation({
    onSuccess: (updated) => {
      utils.businessGroupCard.get.cancel();
      toast.success(
        `${labels.entity.businessGroupCard.singular} başarıyla güncellendi`,
      );
      onUpdate(updated);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        `${labels.entity.businessGroupCard.singular} güncellenirken bir hata oluştu`,
      );
    },
  });

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      id: businessGroupCard.id,
      committee: meclisSayisi === 2 ? { ...committee, meclis3: [] } : committee,
      meclisSayisi: meclisSayisi ?? null,
      uyeSayisi: uyeSayisi === '' ? null : uyeSayisi,
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby={`${labels.entity.businessGroupCard.singular} düzenleme`}
        className="max-h-[99vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>
            {businessGroupCard.businessGroupName} —{' '}
            {labels.entity.businessGroupCard.singular}
          </DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          Alanlara isim yazıp Enter’a veya artı butonuna basarak
          ekleyebilirsiniz. Satış temsilcileri listesinde olmayan isimler de
          girilebilir.
        </p>
        <p className="text-muted-foreground text-sm">
          Bir isim bu kartta birden fazla alanda yer alıyorsa{' '}
          <span className="font-medium text-purple-600 dark:text-purple-400">
            mor
          </span>{' '}
          renkte gösterilir.
        </p>

        <div className="space-y-4">
          {FIELD_GROUPS.map((group) => (
            <Fragment key={group.key}>
              {group.key === 'meclis' && (
                <div className="space-y-2">
                  <Label htmlFor="meclisSayisi">{f.meclisSayisi}</Label>
                  <Select
                    onValueChange={(v) =>
                      setMeclisSayisi(
                        v === '__null__' ? undefined : (Number(v) as 2 | 3),
                      )
                    }
                    value={
                      meclisSayisi !== undefined
                        ? String(meclisSayisi)
                        : undefined
                    }
                  >
                    <SelectTrigger className="w-full" id="meclisSayisi">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__null__">Boş</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {group.key === 'komite' && (
                <div className="space-y-2">
                  <Label htmlFor="uyeSayisi">{f.uyeSayisi}</Label>
                  <Input
                    id="uyeSayisi"
                    onChange={(e) => setUyeSayisi(e.target.value)}
                    value={uyeSayisi}
                  />
                </div>
              )}
              <div className="space-y-3 rounded-lg border p-3">
                <h4 className="font-medium text-sm">
                  {labels.section[group.key]}
                </h4>
                {group.fields.map((field) => (
                  <div className="space-y-2" key={field}>
                    <Label htmlFor={field}>{f[field]}</Label>
                    <TagAutocomplete
                      disabled={field === 'meclis3' && meclisSayisi === 2}
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
            </Fragment>
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
