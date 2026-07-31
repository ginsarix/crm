'use client';

import {
  BookUser,
  Building2,
  Calendar,
  ClipboardList,
  Home,
  Megaphone,
  Search,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { cn } from '~/lib/utils';
import { authClient } from '~/server/better-auth/client';
import { api } from '~/trpc/react';

const pages = [
  { title: 'Panel', icon: Home, href: '/panel/dashboard' },
  { title: 'Cari Kartları', icon: BookUser, href: '/panel/customer-cards' },
  { title: 'Ziyaretler', icon: Calendar, href: '/panel/visits' },
  {
    title: 'Meslek Grubu Kartları',
    icon: Building2,
    href: '/panel/business-group-cards',
    adminOnly: true,
  },
  {
    title: 'Kullanıcılar',
    icon: Users,
    href: '/panel/users',
    adminOnly: true,
  },
  {
    title: 'Duyurular',
    icon: Megaphone,
    href: '/panel/announcements',
    adminOnly: true,
  },
  {
    title: 'Denetim Kayıtları',
    icon: ClipboardList,
    href: '/panel/audit-logs',
    adminOnly: true,
  },
  { title: 'Ayarlar', icon: Settings, href: '/panel/settings' },
  { title: 'Yenilikler', icon: Sparkles, href: '/panel/changelog' },
];

export function CommandPalette() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // Defaults to the Windows/Linux label; corrected client-side post-mount to
  // avoid a server/client hydration mismatch (navigator isn't available on the server)
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Reset on open (not close) — clearing on close would flash the unfiltered
  // "Sayfalar" list during the dialog's fade-out while a selection navigates
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const searchActive = debouncedQuery.length >= 2;
  const { data: cardResults, isFetching: cardsFetching } =
    api.customerCard.get.useQuery(
      {
        filter: { search: debouncedQuery },
        itemsPerPage: 6,
        includeRestricted: true,
      },
      { enabled: searchActive },
    );

  const runCommand = (action: () => void) => {
    setOpen(false);
    action();
  };

  const visiblePages = pages.filter((p) => !p.adminOnly || isAdmin);

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-primary/50 hover:text-primary"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Ara...</span>
        <kbd className="hidden select-none rounded border border-border bg-muted px-1 font-mono text-[10px] sm:inline">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>
      <CommandDialog
        description="Sayfalar arasında geçiş yapın veya cari kart arayın"
        onOpenChange={setOpen}
        open={open}
        title="Komut Paleti"
      >
        <CommandInput
          onValueChange={setQuery}
          placeholder="Sayfa ara ya da isim, sicil, GSM ile cari kart ara..."
          value={query}
        />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          <CommandGroup heading="Sayfalar">
            {visiblePages.map((page) => (
              <CommandItem
                key={page.href}
                onSelect={() => runCommand(() => router.push(page.href))}
                value={page.title}
              >
                <page.icon />
                {page.title}
              </CommandItem>
            ))}
          </CommandGroup>
          {searchActive && cardsFetching && (
            <CommandGroup heading="Cari Kartlar">
              <CommandItem disabled value={query}>
                Aranıyor...
              </CommandItem>
            </CommandGroup>
          )}
          {searchActive && !cardsFetching && !!cardResults?.data.length && (
            <CommandGroup heading="Cari Kartlar">
              {cardResults.data.map((card) => (
                <CommandItem
                  className={cn(card.isRestricted && 'opacity-60')}
                  key={card.id}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(`/panel/customer-cards?id=${card.id}`),
                    )
                  }
                  value={`card-${[card.name, card.sicil, card.businessGroup, card.gsm1].filter(Boolean).join(' ')}`}
                >
                  <BookUser />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {card.name || 'İsimsiz Cari'}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {[card.sicil, card.businessGroup]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
