import { cookies } from 'next/headers';
import Link from 'next/link';
import { NewVersionDialog } from '~/components/new-version-dialog';
import { ThemeToggle } from '~/components/theme-toggle';
import { Separator } from '~/components/ui/separator';
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar';
import { Toaster } from '~/components/ui/sonner';
import { APP_VERSION } from '~/constants/app-version';
import { SidebarNav } from './_components/sidebar-nav';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-screen w-full">
        <SidebarNav />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Separator className="h-4" orientation="vertical" />
            <div className="flex-1" />
            <ThemeToggle />
            <Separator className="h-4" orientation="vertical" />
            <Link
              className="select-none rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em] transition-colors hover:border-primary/50 hover:text-primary"
              href="/panel/changelog"
            >
              v{APP_VERSION}
            </Link>
          </header>
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
      <Toaster />
      <NewVersionDialog />
    </SidebarProvider>
  );
}
