"use client";

import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !Number.isNaN(date.getTime());
}

/**
 * Converts a Date object to Turkish formatted string (DD.MM.YYYY)
 */
function formatDateToTurkish(date: Date | undefined): string {
  if (!date || !isValidDate(date)) {
    return "";
  }
  return date.toLocaleDateString("tr-TR");
}

/**
 * Parses a Turkish formatted date string (DD.MM.YYYY) to Date object in UTC
 */
function parseTurkishDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Try to parse Turkish format (DD.MM.YYYY or DD/MM/YYYY)
  const parts = dateString.split(/[./]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0] ?? "0", 10);
    const month = parseInt(parts[1] ?? "0", 10) - 1; // Months are 0-based
    const year = parseInt(parts[2] ?? "0", 10);

    if (day && month >= 0 && year) {
      // Create date in UTC to avoid timezone shifts
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      if (isValidDate(date)) {
        return date;
      }
    }
  }

  // Fallback to standard Date parsing (assume UTC)
  const date = new Date(dateString);
  return isValidDate(date) ? date : null;
}

/**
 * Parse the initial value from Date or ISO string
 */
function parseValue(val: Date | string | undefined): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return isValidDate(parsed) ? parsed : undefined;
}

export function DatePicker({
  className,
  id,
  onChange,
  value,
}: {
  className?: string;
  id?: string;
  onChange?: (date: Date) => void;
  value?: Date | string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(parseValue(value));
  const [month, setMonth] = useState<Date | undefined>(date);
  const [displayValue, setDisplayValue] = useState(formatDateToTurkish(date));

  // Update internal state when value prop changes
  useEffect(() => {
    const parsed = parseValue(value);
    setDate(parsed);
    setMonth(parsed);
    setDisplayValue(formatDateToTurkish(parsed));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    const parsed = parseTurkishDate(inputValue);
    if (parsed) {
      setDate(parsed);
      setMonth(parsed);
      onChange?.(parsed);
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Convert to UTC to avoid timezone shifts when storing
      const utcDate = new Date(
        Date.UTC(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          0,
          0,
          0,
          0
        )
      );
      setDate(utcDate);
      setMonth(utcDate);
      setDisplayValue(formatDateToTurkish(utcDate));
      onChange?.(utcDate);
    }
    setOpen(false);
  };

  return (
    <div className="relative flex gap-2">
      <Input
        className={cn("bg-background pr-10", className)}
        id={id}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        placeholder="GG.AA.YYYY"
        value={displayValue}
      />
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className="-translate-y-1/2 absolute top-1/2 right-2 size-6"
            id="date-picker"
            type="button"
            variant="ghost"
          >
            <CalendarIcon className="size-3.5" />
            <span className="sr-only">Tarih seçin</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          alignOffset={-8}
          className="w-auto overflow-hidden p-0"
          sideOffset={10}
        >
          <Calendar
            captionLayout="dropdown"
            mode="single"
            month={month}
            onMonthChange={setMonth}
            onSelect={handleCalendarSelect}
            selected={date}
            timeZone="Europe/Istanbul"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
