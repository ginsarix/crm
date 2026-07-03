'use client';

import { MegaphoneIcon } from 'lucide-react';
import { useState } from 'react';
import { AnnouncementListContent } from '~/components/announcement-list-content';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { api } from '~/trpc/react';

export function HeaderAnnouncementsButton() {
  const [open, setOpen] = useState(false);
  const { data: liveAnnouncements } = api.announcement.getLive.useQuery();

  return (
    <>
      <Button
        className="size-8 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        size="icon"
        title="Duyurular"
        type="button"
        variant="ghost"
      >
        <MegaphoneIcon width={15} />
      </Button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duyurular</DialogTitle>
            <DialogDescription>
              Şu anda yayında olan duyurular.
            </DialogDescription>
          </DialogHeader>

          <AnnouncementListContent announcements={liveAnnouncements ?? []} />
        </DialogContent>
      </Dialog>
    </>
  );
}
