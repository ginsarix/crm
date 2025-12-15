"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Spinner } from "./spinner";

export function Combobox({
  id,
  options,
  selectedKey,
  onChange,
  onInputChange,
  label,
  className,
  loading,
}: {
  id?: string;
  options: { key: string; label: string }[];
  selectedKey: string;
  onChange: (value: string) => void;
  onInputChange?: (value: string) => void;
  label?: string;
  className?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover modal={true} onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
          id={id}
          role="combobox"
          variant="outline"
        >
          {selectedKey
            ? options.find((option) => option.key === selectedKey)?.label
            : label
            ? label
            : "Seçiniz"}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            onInput={(e) => onInputChange?.(e.currentTarget.value)}
            placeholder="Ara"
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <Spinner className="mx-auto flex size-6" />
              ) : (
                "Hiçbir seçenek bulunamadı."
              )}
            </CommandEmpty>
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
                      "mr-2 h-4 w-4",
                      selectedKey === option.key ? "opacity-100" : "opacity-0"
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
