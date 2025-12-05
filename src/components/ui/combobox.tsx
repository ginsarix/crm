'use client';

import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '~/lib/utils';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export function Combobox({
  options,
  selectedKey,
  onChange,
  label,
  className,
}: {
  options: { key: string; label: string }[];
  selectedKey: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn('w-[200px] justify-between', className)}
          role="combobox"
          variant="outline"
        >
          {selectedKey
            ? options.find((option) => option.key === selectedKey)?.label
            : label
              ? label
              : 'Seçiniz'}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Ara" />
          <CommandList>
            <CommandEmpty>Hiçbir seçenek bulunamadı.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.key}
                  onSelect={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                  value={option.label}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedKey === option.key ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
