'use client';

import {
  BookUser,
  Building2,
  Calendar,
  ChevronUp,
  ClipboardList,
  Home,
  LogOut,
  Megaphone,
  Settings,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '~/components/ui/sidebar';
import { env } from '~/env';
import { useLabels } from '~/hooks/use-labels';
import { authClient } from '~/server/better-auth/client';
import { labelCompose } from '~/shared/labels/compose';
import type { ResolvedLabels } from '~/shared/labels/types';
import { AccountSheet } from './account-sheet';

const navigationItems = [
  { key: 'dashboard', icon: Home, href: '/panel/dashboard' },
  { key: 'customerCard', icon: BookUser, href: '/panel/customer-cards' },
  { key: 'visit', icon: Calendar, href: '/panel/visits' },
  {
    key: 'businessGroupCard',
    icon: Building2,
    href: '/panel/business-group-cards',
    adminOnly: true,
  },
] as const;

const adminItems = [
  { key: 'users', icon: Users, href: '/panel/users' },
  { key: 'announcements', icon: Megaphone, href: '/panel/announcements' },
  { key: 'auditLogs', icon: ClipboardList, href: '/panel/audit-logs' },
] as const;

const settingsItems = [
  { key: 'settings', icon: Settings, href: '/panel/settings' },
] as const;

function titleForKey(labels: ResolvedLabels, key: string) {
  return key === 'dashboard'
    ? labels.page.dashboard
    : key === 'settings'
      ? labels.page.settings
      : key === 'users'
        ? labels.page.users
        : key === 'announcements'
          ? labels.page.announcements
          : key === 'auditLogs'
            ? labels.page.auditLogs
            : labelCompose.nav(
                labels.entity[key as keyof typeof labels.entity],
              );
}

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const labels = useLabels();
  const { data: session, isPending } = authClient.useSession();
  const { setOpenMobile } = useSidebar();
  const isAdmin = session?.user?.role === 'admin';
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  // Close sidebar on navigation (mobile)
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is used to trigger the effect on navigation
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: router.replace is not a dependency
  useEffect(() => {
    if (!session && !isPending) {
      router.replace('/login');
    }
  }, [session]);

  const signOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace('/login');
        },
      },
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded bg-sidebar-primary font-bold font-mono text-sidebar-primary-foreground text-sm tracking-tighter">
                  {env.NEXT_PUBLIC_APP_TITLE[0]}
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold text-sm tracking-wide">
                    {env.NEXT_PUBLIC_APP_TITLE}
                  </span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                    Yönetim Paneli
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.15em]">
            Navigasyon
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems
                .filter(
                  (item) =>
                    !('adminOnly' in item) || !item.adminOnly || isAdmin,
                )
                .map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={titleForKey(labels, item.key)}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{titleForKey(labels, item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.15em]">
            Sistem
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin &&
                adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={titleForKey(labels, item.key)}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{titleForKey(labels, item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={titleForKey(labels, item.key)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{titleForKey(labels, item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/panel/changelog'}
              tooltip="Yenilikler"
            >
              <Link href="/panel/changelog">
                <Sparkles />
                <span>Yenilikler →</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="cursor-pointer"
                  size="lg"
                  tooltip={session?.user?.name ?? 'Profil'}
                >
                  <Avatar className="size-8 rounded-md">
                    <AvatarFallback className="rounded-md bg-sidebar-primary font-mono font-semibold text-sidebar-primary-foreground text-xs">
                      {session?.user?.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-semibold text-sm">
                      {session?.user?.name ?? '—'}
                    </span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {isAdmin ? 'Yönetici' : 'Kullanıcı'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64"
                side="top"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-0">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <Avatar className="size-9 rounded-md">
                      <AvatarFallback className="rounded-md bg-sidebar-primary font-mono font-semibold text-sidebar-primary-foreground text-xs">
                        {session?.user?.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid leading-tight">
                      <span className="truncate font-semibold text-sm">
                        {session?.user?.name ?? '—'}
                      </span>
                      <span className="truncate text-muted-foreground text-xs">
                        {session?.user?.email ?? ''}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setAccountSheetOpen(true)}
                >
                  <UserCog className="size-4" />
                  Hesap Ayarları
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="size-4" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
      <AccountSheet
        onOpenChange={setAccountSheetOpen}
        open={accountSheetOpen}
      />
    </Sidebar>
  );
}
