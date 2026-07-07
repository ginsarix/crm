import { MegaphoneIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '~/lib/utils';

export function AnnouncementBanner({
  imagePath,
  title,
  className,
}: {
  imagePath: string | null;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-[1.91/1] w-full shrink-0 overflow-hidden rounded-md bg-muted',
        className,
      )}
    >
      {imagePath ? (
        <Image
          alt={title}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          src={imagePath}
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <MegaphoneIcon className="size-8" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
