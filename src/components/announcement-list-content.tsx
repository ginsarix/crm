'use client';

import type { Announcement } from 'generated/prisma';
import { useEffect, useState } from 'react';
import { AnnouncementBanner } from '~/components/announcement-banner';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/ui/carousel';
import { cn } from '~/lib/utils';

export function AnnouncementListContent({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (announcements.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground text-sm">
        Şu anda yayında bir duyuru yok.
      </p>
    );
  }

  return (
    <Carousel className="w-full space-y-3" setApi={setApi}>
      <CarouselContent>
        {announcements.map((announcement) => (
          <CarouselItem key={announcement.id}>
            <div className="overflow-hidden rounded-md border">
              <AnnouncementBanner
                imagePath={announcement.imagePath}
                title={announcement.title}
              />
              <div className="space-y-1 p-3.5">
                <h4 className="font-semibold text-sm tracking-tight">
                  {announcement.title}
                </h4>
                {announcement.body && (
                  <p className="max-h-32 overflow-y-auto text-muted-foreground text-sm leading-snug">
                    {announcement.body}
                  </p>
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {announcements.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <CarouselPrevious className="static size-7 translate-y-0 rounded-full" />
          <div className="flex items-center gap-1.5">
            {announcements.map((announcement, index) => (
              <button
                aria-label={`${index + 1}. duyuruya git`}
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  index === current
                    ? 'bg-foreground'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60',
                )}
                key={announcement.id}
                onClick={() => api?.scrollTo(index)}
                type="button"
              />
            ))}
          </div>
          <CarouselNext className="static size-7 translate-y-0 rounded-full" />
        </div>
      )}
    </Carousel>
  );
}
