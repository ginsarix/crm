import { cookies } from 'next/headers';
import { Separator } from '~/components/ui/separator';
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar';
import { Toaster } from '~/components/ui/sonner';
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
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase select-none">
              Nesbir CRM
            </span>
          </header>
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
