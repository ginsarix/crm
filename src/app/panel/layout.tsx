import { cookies } from "next/headers";
import { Separator } from "~/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
import { SidebarNav } from "./_components/sidebar-nav";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-screen w-full">
        <SidebarNav />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger />
            <Separator className="h-6" orientation="vertical" />
            <div className="flex-1">
              <h1 className="font-semibold text-lg">CRM Dashboard</h1>
            </div>
          </header>
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
