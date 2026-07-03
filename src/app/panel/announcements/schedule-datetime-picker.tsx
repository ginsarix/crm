'use client';

import { DatePicker } from '~/app/_components/date-picker';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

function toTimeInputValue(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Combines the shared `DatePicker` (date-only) with a native time input into a
// single `Date | null` value, since the announcement schema stores start/end
// as one field rather than separate date/time columns.
export function ScheduleDateTimePicker({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
}) {
  function handleDateChange(picked: Date) {
    const hours = value?.getHours() ?? 0;
    const minutes = value?.getMinutes() ?? 0;
    onChange(
      new Date(
        picked.getUTCFullYear(),
        picked.getUTCMonth(),
        picked.getUTCDate(),
        hours,
        minutes,
      ),
    );
  }

  function handleTimeChange(raw: string) {
    if (!raw) {
      if (value) {
        onChange(
          new Date(value.getFullYear(), value.getMonth(), value.getDate()),
        );
      }
      return;
    }
    const [hours, minutes] = raw.split(':').map(Number);
    const base = value ?? new Date();
    onChange(
      new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        hours ?? 0,
        minutes ?? 0,
      ),
    );
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <div className="min-w-0 flex-1">
        <DatePicker
          id={id}
          onChange={handleDateChange}
          value={value ?? undefined}
        />
      </div>
      <Input
        className="w-[100px] shrink-0"
        onChange={(e) => handleTimeChange(e.target.value)}
        type="time"
        value={toTimeInputValue(value)}
      />
    </div>
  );
}
