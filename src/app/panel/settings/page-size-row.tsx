'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

export function PageSizeRow({
  canRemove,
  error,
  isDefault,
  onChange,
  onRemove,
  onSetDefault,
  value,
}: {
  canRemove: boolean;
  error?: string;
  isDefault: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
  onSetDefault: () => void;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        aria-label="Varsayılan"
        checked={isDefault}
        className="mt-3 cursor-pointer"
        onChange={onSetDefault}
        type="radio"
      />
      <div className="flex-1">
        <Input
          aria-label="Sayfa Başı Satır Sayısı"
          className={cn('w-28', error && 'border-destructive')}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        {error && <p className="mt-1 text-destructive text-xs">{error}</p>}
      </div>
      <Button
        aria-label="Seçeneği Sil"
        className="cursor-pointer"
        disabled={!canRemove}
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
