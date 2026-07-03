import type { Announcement } from 'generated/prisma';
import { AnnouncementBanner } from '~/components/announcement-banner';
import { getAnnouncementStatus } from '~/lib/announcement-status';
import { AnnouncementActions } from './announcement-actions';
import { ScheduleLine } from './schedule-line';
import { AnnouncementStatusBadge } from './status-badge';

export function AnnouncementGridCard({
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
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="relative p-2.5 pb-0">
        <AnnouncementBanner
          imagePath={announcement.imagePath}
          title={announcement.title}
        />
        <div className="absolute top-5 right-5">
          <AnnouncementStatusBadge overlay status={status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-[15.5px] leading-tight tracking-tight">
          {announcement.title}
        </h3>
        {announcement.body && (
          <p className="line-clamp-2 text-muted-foreground text-sm leading-snug">
            {announcement.body}
          </p>
        )}
        <div className="mt-auto pt-1">
          <ScheduleLine
            end={announcement.end}
            start={announcement.start}
            status={status}
          />
        </div>
      </div>
      <div className="border-t p-3">
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
