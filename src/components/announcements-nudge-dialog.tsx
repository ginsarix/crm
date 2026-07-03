'use client';

import { AnnouncementListContent } from '~/components/announcement-list-content';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { useAnnouncementNudge } from '~/hooks/use-announcement-nudge';
import { api } from '~/trpc/react';

export function AnnouncementsNudgeDialog() {
  const { data: liveAnnouncements } = api.announcement.getLive.useQuery();
  const { nudgeActive, dismissNudge } = useAnnouncementNudge(
    liveAnnouncements?.map((a) => ({ id: a.id, start: a.start })),
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) dismissNudge();
      }}
      open={nudgeActive}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duyurular</DialogTitle>
        </DialogHeader>

        <AnnouncementListContent announcements={liveAnnouncements ?? []} />

        <DialogFooter>
          <Button onClick={dismissNudge}>Anladım</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
