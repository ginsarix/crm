'use client';

import { useRouter } from 'next/navigation';
import { APP_VERSION } from '~/constants/app-version';
import { RELEASES } from '~/constants/releases';
import { useNewVersionNudge } from '~/hooks/use-new-version-nudge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export function NewVersionDialog() {
  const { newVersionNudgeActive, dismissNudge } = useNewVersionNudge();
  const router = useRouter();

  const latestRelease = RELEASES[0];

  function goToChangelog() {
    dismissNudge();
    router.push('/panel/changelog');
  }

  if (!latestRelease) return null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) dismissNudge();
      }}
      open={newVersionNudgeActive}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Yeni sürüm mevcut
            <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-bold font-mono text-primary text-xs">
              v{APP_VERSION}
            </span>
          </DialogTitle>
          <DialogDescription>
            Son ziyaretinizden bu yana uygulamada{' '}
            <span className="font-medium text-foreground">
              {latestRelease.changes.length} değişiklik
            </span>{' '}
            yapıldı.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/50 p-3">
          {latestRelease.changes.slice(0, 3).map((change, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list
            <div className="flex items-start gap-2" key={i}>
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-[13px] text-foreground/80 leading-snug">
                {change.title}
              </span>
            </div>
          ))}
          {latestRelease.changes.length > 3 && (
            <p className="mt-0.5 pl-3.5 text-[11px] text-muted-foreground">
              +{latestRelease.changes.length - 3} değişiklik daha…
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={dismissNudge} variant="outline">
            Anladım
          </Button>
          <Button onClick={goToChangelog}>Yeniliklere Bak →</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
