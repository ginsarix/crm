import type { Announcement } from 'generated/prisma';
import {
  CalendarClockIcon,
  PencilIcon,
  Trash2Icon,
  ZapIcon,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { AnnouncementStatus } from '~/lib/announcement-status';

export function AnnouncementActions({
  status,
  announcement,
  onEdit,
  onReschedule,
  onPublishNow,
  onDelete,
}: {
  status: AnnouncementStatus;
  announcement: Announcement;
  onEdit: (a: Announcement) => void;
  onReschedule: (a: Announcement) => void;
  onPublishNow: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== 'live' && (
        <Button
          onClick={() => onPublishNow(announcement)}
          size="sm"
          title="Şimdi yayınla"
          type="button"
        >
          <ZapIcon className="size-3.5" />
          Şimdi Yayınla
        </Button>
      )}
      <Button
        onClick={() => onEdit(announcement)}
        size="icon-sm"
        title="Başlık / metni düzenle"
        type="button"
        variant="outline"
      >
        <PencilIcon className="size-3.5" />
      </Button>
      <Button
        onClick={() => onReschedule(announcement)}
        size="icon-sm"
        title="Zamanlamayı değiştir"
        type="button"
        variant="outline"
      >
        <CalendarClockIcon className="size-3.5" />
      </Button>
      <Button
        className="text-destructive hover:text-destructive"
        onClick={() => onDelete(announcement)}
        size="icon-sm"
        title="Sil"
        type="button"
        variant="outline"
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
