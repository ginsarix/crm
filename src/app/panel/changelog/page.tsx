'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EntryFeedbackButtons } from '~/components/entry-feedback-buttons';
import { type ChangeType, RELEASES } from '~/constants/releases';

const BADGE_CONFIG: Record<ChangeType, { label: string; className: string }> = {
  new: {
    label: 'Yeni',
    className: 'bg-primary/10 text-primary border-primary/30',
  },
  fix: {
    label: 'Düzeltme',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  improved: {
    label: 'İyileştirme',
    className:
      'bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400',
  },
  changed: {
    label: 'Değiştirildi',
    className:
      'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400',
  },
  removed: {
    label: 'Kaldırıldı',
    className: 'bg-muted text-muted-foreground border-border',
  },
  announcement: {
    label: 'Duyuru',
    className:
      'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400',
  },
};

const FILTER_OPTIONS: Array<{ key: ChangeType | 'all'; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'announcement', label: BADGE_CONFIG.announcement.label },
  { key: 'new', label: BADGE_CONFIG.new.label },
  { key: 'fix', label: BADGE_CONFIG.fix.label },
  { key: 'improved', label: BADGE_CONFIG.improved.label },
  { key: 'changed', label: BADGE_CONFIG.changed.label },
  { key: 'removed', label: BADGE_CONFIG.removed.label },
];

function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const { label, className } = BADGE_CONFIG[type];
  return (
    <span
      className={`inline-flex w-24 shrink-0 items-center justify-center rounded border px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}

export default function ChangelogPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ChangeType | 'all'>('all');
  const [activeId, setActiveId] = useState(RELEASES[0]?.id ?? '');
  const contentRef = useRef<HTMLDivElement>(null);

  const matchesSearch = useCallback(
    (title: string, desc?: string) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        title.toLowerCase().includes(q) ||
        (!!desc && desc.toLowerCase().includes(q))
      );
    },
    [search],
  );

  const counts = Object.fromEntries(
    FILTER_OPTIONS.slice(1).map(({ key }) => {
      const type = key as ChangeType;
      const n = RELEASES.flatMap((r) => r.changes).filter(
        (c) => c.type === type && matchesSearch(c.title, c.desc),
      ).length;
      return [type, n];
    }),
  ) as Record<ChangeType, number>;

  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { root, rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    for (const r of RELEASES) {
      const el = root.querySelector(`#${r.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [filter, search]);

  const scrollToRelease = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({
        top: (el as HTMLElement).offsetTop - 48,
        behavior: 'smooth',
      });
    }
    setActiveId(id);
  }, []);

  const hasAnyResult = RELEASES.some((r) =>
    r.changes.some(
      (c) =>
        (filter === 'all' || c.type === filter) &&
        matchesSearch(c.title, c.desc),
    ),
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* Left: version nav */}
      <aside className="hidden w-48 shrink-0 overflow-y-auto border-r py-4 sm:block">
        <p className="mb-2 px-4 font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          Sürümler
        </p>
        <nav>
          {RELEASES.map((r) => {
            const isActive = r.id === activeId;
            const [day, month] = r.date.split(' ');
            return (
              <button
                className={`flex w-full items-center justify-between gap-2 border-l-2 px-4 py-2 text-left transition-colors hover:bg-accent ${
                  isActive ? 'border-primary bg-accent' : 'border-transparent'
                }`}
                key={r.id}
                onClick={() => scrollToRelease(r.id)}
                type="button"
              >
                <div>
                  <span
                    className={`block font-mono text-[12.5px] tracking-tight transition-colors ${
                      isActive
                        ? 'font-semibold text-foreground'
                        : 'text-foreground/70'
                    }`}
                  >
                    v{r.version}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {day} {month}
                  </span>
                </div>
                {r.id === RELEASES[0]?.id && (
                  <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-bold font-mono text-[9px] text-primary uppercase tracking-wider">
                    Son
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right: main content */}
      <div
        className="flex-1 overflow-y-auto px-6 py-8 sm:px-10"
        ref={contentRef}
      >
        <div className="mx-auto max-w-3xl">
          {/* Page heading */}
          <div className="mb-8">
            <h1 className="font-bold text-2xl tracking-tight">Sürüm Notları</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Uygulamada yapılan değişiklikler ve yenilikler
            </p>
          </div>

          {/* Search + filter */}
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map(({ key, label }) => {
                const isActive = filter === key;
                const count =
                  key === 'all' ? allCount : counts[key as ChangeType];
                return (
                  <button
                    className={`inline-flex h-7 items-center gap-1.5 rounded border px-2.5 font-medium text-[11.5px] transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                    key={key}
                    onClick={() => setFilter(key)}
                    type="button"
                  >
                    {label}
                    <span
                      className={`min-w-[16px] rounded px-1 text-center font-semibold text-[10px] ${
                        isActive
                          ? 'bg-white/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative shrink-0">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                width={12}
              />
              <input
                className="h-8 w-52 rounded border border-input bg-input pr-7 pl-8 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/40"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Değişikliklerde ara…"
                type="text"
                value={search}
              />
              {search && (
                <button
                  aria-label="Aramayı temizle"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                  type="button"
                >
                  <XIcon width={10} />
                </button>
              )}
            </div>
          </div>

          {/* Release sections */}
          {hasAnyResult ? (
            RELEASES.map((release) => {
              const filtered = release.changes.filter(
                (c) =>
                  (filter === 'all' || c.type === filter) &&
                  matchesSearch(c.title, c.desc),
              );
              if (!filtered.length) return null;

              return (
                <section className="mb-14" id={release.id} key={release.id}>
                  <div className="mb-5 flex items-center gap-3 border-b pb-4">
                    <h2 className="font-mono font-semibold text-xl tracking-tight">
                      v{release.version}
                    </h2>
                    {release.id === RELEASES[0]?.id && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-bold font-mono text-[9.5px] text-primary uppercase tracking-wider">
                        Son
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[12px] text-muted-foreground">
                      {release.date}
                    </span>
                  </div>

                  <div className="-mx-2.5 flex flex-col">
                    {filtered.map((change, i) => (
                      <div
                        className="group grid grid-cols-[96px_1fr] gap-3.5 rounded px-2.5 py-2.5 hover:bg-accent"
                        key={i}
                      >
                        <div className="pt-0.5">
                          <ChangeTypeBadge type={change.type} />
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-[13.5px] leading-snug">
                              {change.title}
                            </p>
                            {change.desc && (
                              <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                                {change.desc}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                            <EntryFeedbackButtons
                              changeTitle={change.title}
                              version={release.version}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="flex flex-col items-center gap-2.5 py-20 text-center">
              <div className="flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
                <SearchIcon width={14} />
              </div>
              <p className="font-medium text-[13px]">Değişiklik bulunamadı</p>
              <p className="text-[12px] text-muted-foreground">
                {search
                  ? `"${search}" için sonuç yok`
                  : 'Tüm sürümlerde bu türde değişiklik yok'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
