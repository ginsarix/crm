import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { AnnouncementStatus } from '~/lib/announcement-status';

function fmtShort(date: Date) {
  return format(date, 'd MMM HH:mm', { locale: tr });
}

export function ScheduleLine({
  status,
  start,
  end,
}: {
  status: AnnouncementStatus;
  start: Date | null;
  end: Date | null;
}) {
  let text: string;
  if (status === 'draft') {
    text = 'Zamanlama yok · Taslak';
  } else if (!start) {
    text = 'Süresiz yayında';
  } else {
    text = `${fmtShort(start)} → ${end ? fmtShort(end) : 'süresiz'}`;
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
      <CalendarIcon className="size-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
