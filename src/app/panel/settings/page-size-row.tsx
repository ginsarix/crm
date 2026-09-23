'use client';

import { InfoIcon, Trash2 } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

export function PageSizeRow({
  canRemove,
  error,
  isDefault,
  name,
  onChange,
  onRemove,
  onSetDefault,
  value,
}: {
  canRemove: boolean;
  error?: string;
  isDefault: boolean;
  name: string;
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
        name={name}
        onChange={onSetDefault}
        type="radio"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Sayfa Başı Satır Sayısı"
            className={cn('w-28', error && 'border-destructive')}
            inputMode="numeric"
            onChange={(event) => onChange(event.target.value)}
            value={value}
          />
          {/* Mirrors the checked radio for people who read the row rather than
              the column — the radio alone is easy to miss at a glance. The
              tooltip rides on the chip so the explanation sits with the thing
              it explains, and only appears on the row it applies to. */}
          {isDefault && (
            <Badge className="gap-1 font-normal" variant="secondary">
              Varsayılan
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="size-3 shrink-0 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px]">
                    <p className="text-xs">
                      Bu liste açıldığında kullanılacak sayfa boyutu.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Badge>
          )}
        </div>
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
