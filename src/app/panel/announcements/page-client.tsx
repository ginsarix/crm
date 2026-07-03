'use client';

import type { Announcement } from 'generated/prisma';
import { LayoutGridIcon, ListIcon, MegaphoneIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LAYOUT_MODE_COOKIE_NAME } from '~/app/panel/announcements/layout-mode-cookie';
import { Spinner } from '~/components/ui/spinner';
import {
  type AnnouncementStatus,
  getAnnouncementStatus,
} from '~/lib/announcement-status';
import { cn } from '~/lib/utils';
import type { LayoutMode } from '~/shared/types/layout-mode';
import { api } from '~/trpc/react';
import { CreateAnnouncementDialog } from './create-dialog';
import { DeleteAnnouncementDialog } from './delete-dialog';
import { EditAnnouncementDialog } from './edit-dialog';
import { AnnouncementGridCard } from './grid-card';
import { AnnouncementListRow } from './list-row';
import { PublishNowDialog } from './publish-now-dialog';
import { RescheduleAnnouncementDialog } from './reschedule-dialog';

const FILTERS: [AnnouncementStatus | 'all', string][] = [
  ['all', 'Tümü'],
  ['live', 'Yayında'],
  ['scheduled', 'Zamanlanmış'],
  ['draft', 'Taslak'],
  ['expired', 'Süresi Doldu'],
];

const STATUS_ORDER: Record<AnnouncementStatus, number> = {
  live: 0,
  scheduled: 1,
  draft: 2,
  expired: 3,
};

const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setLayoutModeCookie(value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: persist layout mode without breaking Next.js SSR
  document.cookie = `${LAYOUT_MODE_COOKIE_NAME}=${value}; path=/panel/announcements; max-age=${LAYOUT_COOKIE_MAX_AGE}`;
}

export function AnnouncementsPageClient({
  initialLayoutMode,
}: {
  initialLayoutMode: LayoutMode;
}) {
  const { data, isLoading } = api.announcement.get.useQuery();
  const [filter, setFilter] = useState<AnnouncementStatus | 'all'>('all');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialLayoutMode);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [rescheduling, setRescheduling] = useState<Announcement | null>(null);
  const [publishing, setPublishing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  function changeLayoutMode(value: LayoutMode) {
    setLayoutMode(value);
    setLayoutModeCookie(value);
  }

  const now = new Date();

  const counts = useMemo(() => {
    const c: Record<AnnouncementStatus | 'all', number> = {
      all: data?.length ?? 0,
      live: 0,
      scheduled: 0,
      draft: 0,
      expired: 0,
    };
    for (const a of data ?? []) c[getAnnouncementStatus(a, now)]++;
    return c;
  }, [data, now]);

  const sorted = useMemo(() => {
    const shown =
      filter === 'all'
        ? (data ?? [])
        : (data ?? []).filter((a) => getAnnouncementStatus(a, now) === filter);
    return [...shown].sort(
      (a, b) =>
        STATUS_ORDER[getAnnouncementStatus(a, now)] -
        STATUS_ORDER[getAnnouncementStatus(b, now)],
    );
  }, [data, filter, now]);

  const actionHandlers = {
    onEdit: setEditing,
    onReschedule: setRescheduling,
    onPublishNow: setPublishing,
    onDelete: setDeleting,
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-3xl tracking-tight">Duyurular</h2>
            <p className="mt-1 max-w-lg text-muted-foreground">
              Duyuru görsellerini yükleyin, zamanlayın ve anında yayınlayın.
            </p>
          </div>
          <CreateAnnouncementDialog />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([key, label]) => {
              const active = filter === key;
              return (
                <button
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-semibold text-sm transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-input text-muted-foreground hover:text-foreground',
                  )}
                  key={key}
                  onClick={() => setFilter(key)}
                  type="button"
                >
                  {label}
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-mono text-[10.5px]',
                      active ? 'bg-white/20' : 'bg-muted',
                    )}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 rounded-md bg-muted p-1">
            <button
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold text-sm transition-colors',
                layoutMode === 'grid'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground',
              )}
              onClick={() => changeLayoutMode('grid')}
              type="button"
            >
              <LayoutGridIcon className="size-3.5" />
              Izgara
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold text-sm transition-colors',
                layoutMode === 'list'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground',
              )}
              onClick={() => changeLayoutMode('list')}
              type="button"
            >
              <ListIcon className="size-3.5" />
              Liste
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner className="size-6" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-lg bg-muted">
              <MegaphoneIcon className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Bu filtrede duyuru yok
              </p>
              <p className="mt-1 text-sm">
                Yeni bir duyuru ekleyerek başlayın.
              </p>
            </div>
          </div>
        ) : layoutMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((announcement) => (
              <AnnouncementGridCard
                announcement={announcement}
                key={announcement.id}
                now={now}
                {...actionHandlers}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((announcement) => (
              <AnnouncementListRow
                announcement={announcement}
                key={announcement.id}
                now={now}
                {...actionHandlers}
              />
            ))}
          </div>
        )}
      </div>
      {editing && (
        <EditAnnouncementDialog
          announcement={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          open={!!editing}
        />
      )}
      {rescheduling && (
        <RescheduleAnnouncementDialog
          announcement={rescheduling}
          onOpenChange={(open) => !open && setRescheduling(null)}
          open={!!rescheduling}
        />
      )}
      {publishing && (
        <PublishNowDialog
          announcement={publishing}
          onOpenChange={(open) => !open && setPublishing(null)}
          open={!!publishing}
        />
      )}
      {deleting && (
        <DeleteAnnouncementDialog
          announcement={deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          open={!!deleting}
        />
      )}
    </div>
  );
}
