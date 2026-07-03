import type { Announcement } from 'generated/prisma';
import { AnnouncementBanner } from '~/components/announcement-banner';
import { getAnnouncementStatus } from '~/lib/announcement-status';
import { AnnouncementActions } from './announcement-actions';
import { ScheduleLine } from './schedule-line';
import { AnnouncementStatusBadge } from './status-badge';

export function AnnouncementListRow({
  announcement,
  now,
  onEdit,
  onReschedule,
  onPublishNow,
  onDelete,
}: {
  announcement: Announcement;
  now: Date;
  onEdit: (a: Announcement) => void;
  onReschedule: (a: Announcement) => void;
  onPublishNow: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
}) {
  const status = getAnnouncementStatus(announcement, now);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3">
      <div className="w-42 shrink-0">
        <AnnouncementBanner
          imagePath={announcement.imagePath}
          title={announcement.title}
        />
      </div>
      <div className="flex min-w-50 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-semibold text-[15.5px] tracking-tight">
            {announcement.title}
          </h3>
          <AnnouncementStatusBadge status={status} />
        </div>
        {announcement.body && (
          <p className="line-clamp-2 max-w-140 text-muted-foreground text-sm leading-snug">
            {announcement.body}
          </p>
        )}
        <ScheduleLine
          end={announcement.end}
          start={announcement.start}
          status={status}
        />
      </div>
      <div className="ml-auto">
        <AnnouncementActions
          announcement={announcement}
          onDelete={onDelete}
          onEdit={onEdit}
          onPublishNow={onPublishNow}
          onReschedule={onReschedule}
          status={status}
        />
      </div>
    </div>
  );
}
