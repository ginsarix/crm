import { Badge } from '~/components/ui/badge';
import type { AnnouncementStatus } from '~/lib/announcement-status';
import { cn } from '~/lib/utils';

const STATUS_CONFIG: Record<
  AnnouncementStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'secondary' | 'error';
    dot: string;
  }
> = {
  live: { label: 'Yayında', variant: 'success', dot: 'bg-green-500' },
  scheduled: {
    label: 'Zamanlanmış',
    variant: 'warning',
    dot: 'bg-yellow-500',
  },
  draft: { label: 'Taslak', variant: 'secondary', dot: 'bg-muted-foreground' },
  expired: { label: 'Süresi Doldu', variant: 'error', dot: 'bg-red-500' },
};

export function AnnouncementStatusBadge({
  status,
  className,
  overlay,
}: {
  status: AnnouncementStatus;
  className?: string;
  // Solid, image-independent pill for placement on top of the announcement's
  // own uploaded photo — the tinted Badge variants blend into busy/matching-hue images.
  overlay?: boolean;
}) {
  const config = STATUS_CONFIG[status];

  if (overlay) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border bg-background/95 px-2.5 py-1 font-mono font-semibold text-[11px] text-foreground tracking-wide shadow-sm backdrop-blur-sm',
          className,
        )}
      >
        <span className={cn('size-1.5 shrink-0 rounded-full', config.dot)} />
        {config.label}
      </div>
    );
  }

  return (
    <Badge
      className={cn('font-mono tracking-wide', className)}
      variant={config.variant}
    >
      {config.label}
    </Badge>
  );
}
