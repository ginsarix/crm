'use client';

import { PlusIcon, XIcon } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';

export function TagAutocomplete({
  id,
  values,
  onChange,
  suggestions,
  placeholder = 'İsim yazın, eklemek için Enter’a basın',
  className,
}: {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    return suggestions
      .filter((s) => !values.includes(s))
      .filter((s) => (query === '' ? true : s.toLowerCase().includes(query)))
      .slice(0, 20);
  }, [suggestions, values, inputValue]);

  const addValue = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '' || values.includes(trimmed)) {
      setInputValue('');
      return;
    }
    onChange([...values, trimmed]);
    setInputValue('');
  };

  const removeValue = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow] has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 dark:bg-input/30',
        )}
      >
        {values.map((value) => (
          <Badge className="gap-1 pr-1" key={value} variant="secondary">
            <span className="max-w-40 truncate">{value}</span>
            <button
              aria-label={`${value} kaldır`}
              className="cursor-pointer rounded-sm p-0.5 hover:bg-muted-foreground/20"
              onClick={() => removeValue(value)}
              type="button"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          id={inputId}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addValue(inputValue);
            } else if (
              e.key === 'Backspace' &&
              inputValue === '' &&
              values.length > 0
            ) {
              removeValue(values[values.length - 1] as string);
            }
          }}
          placeholder={values.length === 0 ? placeholder : undefined}
          ref={inputRef}
          value={inputValue}
        />
        <button
          aria-label="Ekle"
          className="shrink-0 cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          disabled={inputValue.trim() === ''}
          onClick={() => {
            addValue(inputValue);
            inputRef.current?.focus();
          }}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>

      {open && filteredSuggestions.length > 0 && (
        <div className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {filteredSuggestions.map((suggestion) => (
            <button
              className="w-full cursor-default select-none rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              key={suggestion}
              onClick={() => addValue(suggestion)}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
