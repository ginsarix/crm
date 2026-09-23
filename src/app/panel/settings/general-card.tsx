'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { useLabels } from '~/hooks/use-labels';
import type { CustomerCardBulkMode } from '~/shared/zod-schemas/app-setting';
import { api } from '~/trpc/react';

export function GeneralCard() {
  const labels = useLabels();
  const utils = api.useUtils();
  const { data: saved } = api.appSetting.get.useQuery();
  // null = untouched, so the radios follow `saved` until the admin picks one.
  const [draft, setDraft] = useState<CustomerCardBulkMode | null>(null);
  const current = draft ?? saved?.customerCardBulkMode;

  const updateMutation = api.appSetting.update.useMutation({
    onSuccess: async () => {
      toast.success('Genel ayarlar kaydedildi');
      await utils.appSetting.get.invalidate();
      setDraft(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const dirty =
    draft !== null &&
    saved !== undefined &&
    draft !== saved.customerCardBulkMode;

  // The entity and field names always stand alone (heading, parenthetical),
  // so a renamed noun never needs a Turkish suffix composed onto it.
  const options: { value: CustomerCardBulkMode; label: string }[] = [
    { value: 'color_delete', label: 'Renk ve silme (varsayılan)' },
    {
      value: 'vote',
      label: `Yalnızca ${labels.field.customerCard.vote} (Geldi/Gelmedi/Boş)`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Genel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">
            {labels.entity.customerCard.plural} — Toplu Seçim
          </p>
          {dirty && (
            <span className="inline-block size-1.5 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Birden fazla satır seçildiğinde hangi işlemlerin sunulacağını
          belirler.
        </p>

        <div className="space-y-2">
          {options.map((option) => (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm"
              key={option.value}
            >
              <input
                checked={current === option.value}
                className="cursor-pointer"
                disabled={current === undefined}
                name="customer-card-bulk-mode"
                onChange={() => setDraft(option.value)}
                type="radio"
              />
              {option.label}
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            className="cursor-pointer"
            disabled={!dirty || updateMutation.isPending}
            onClick={() =>
              draft && updateMutation.mutate({ customerCardBulkMode: draft })
            }
            size="sm"
            type="button"
          >
            {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
