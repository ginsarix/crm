'use client';

import { RotateCcw } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

type LabelFieldRowProps = {
  id: string;
  position: number;
  /** 'Formda Zorunlu' | 'Formda Opsiyonel' | 'Meslek Grubundan' | ... */
  badge: string;
  defaultValue: string;
  /** Read-only rows (inherited/composed) pass undefined. */
  value?: string;
  onChange?: (value: string) => void;
  onReset?: () => void;
  unit?: string;
};

export function LabelFieldRow({
  badge,
  defaultValue,
  id,
  onChange,
  onReset,
  position,
  unit = 'Alan',
  value,
}: LabelFieldRowProps) {
  const readOnly = onChange === undefined;

  return (
    <div className="flex items-center gap-3">
      <Label className="w-40 shrink-0 text-sm" htmlFor={id}>
        {position}. {unit}
      </Label>
      <Badge className="w-40 shrink-0 justify-center" variant="secondary">
        {badge}
      </Badge>
      {readOnly ? (
        <span className="flex-1 text-muted-foreground text-sm">
          {defaultValue}
        </span>
      ) : (
        <>
          <Input
            className="flex-1"
            id={id}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultValue}
            value={value ?? ''}
          />
          <Button
            aria-label="Varsayılanı Getir"
            onClick={onReset}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
