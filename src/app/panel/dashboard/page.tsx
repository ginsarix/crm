import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { auditAction } from '~/lib/enum-map';
import { createLocaleSorter } from '~/lib/utils';
import { auth } from '~/server/better-auth';
import { api } from '~/trpc/server';
import { BusinessGroupAlerts } from '../_components/business-group-alerts';
import { BusinessGroupFilter } from '../_components/business-group-filter';

const ALL_KEY = '__all__';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, resolvedParams] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    searchParams,
  ]);
  const isAdmin = session?.user.role === 'admin';

  const allBusinessGroups = isAdmin ? await api.businessGroup.get() : [];

  let selectedGroup: string | null = null;
  if (isAdmin) {
    const bgParam =
      typeof resolvedParams.bg === 'string' ? resolvedParams.bg : undefined;
    if (bgParam === ALL_KEY) {
      selectedGroup = null;
    } else if (bgParam) {
      selectedGroup = bgParam;
    } else {
      const sorted = [...allBusinessGroups].sort(createLocaleSorter('name'));
      selectedGroup = sorted.find((g) => g.name.startsWith('01'))?.name ?? null;
    }
  }

  const [
    customerTotal,
    colorCounts,
    visitTotal,
    latestAudit,
    businessGroupStats,
    visitRanking,
    graySubtractionBusinessGroupCount,
  ] = await Promise.all([
    api.customerCard.getTotal({ businessGroup: selectedGroup ?? undefined }),
    api.customerCard.getColorCounts({
      businessGroup: selectedGroup ?? undefined,
    }),
    api.visit.getTotal({ businessGroup: selectedGroup ?? undefined }),
    api.auditLog.getLatest(),
    api.businessGroup.getStats({ businessGroup: selectedGroup ?? undefined }),
    api.visit.getRankedVisitsBySalesRepresentative({
      businessGroup: selectedGroup ?? undefined,
    }),
    isAdmin && selectedGroup === null
      ? api.businessGroup.getGraySubtractionBusinessGroupCount()
      : Promise.resolve(null),
  ]);

  return (
    <div className="w-full">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-400">
          <div className="relative mx-auto mb-6 flex aspect-2.5/1 w-150 overflow-hidden rounded-lg">
            <Image
              alt="Biz Geleceğiz"
              className="object-cover object-[center_44%]"
              fill
              priority
              src="/images/biz-gelecegiz-banner.png"
            />
          </div>
          {isAdmin && (
            <div className="mb-4">
              <p className="mb-1.5 text-muted-foreground text-sm">
                Meslek Grubu
              </p>
              <BusinessGroupFilter
                groups={allBusinessGroups}
                selected={selectedGroup}
              />
            </div>
          )}
          <div className="mb-6">
            <h2 className="font-bold text-3xl tracking-tight">Panel</h2>
            <p className="text-muted-foreground">CRM Panelinize hoş geldiniz</p>
          </div>
          <div
            className={`grid gap-3 ${!graySubtractionBusinessGroupCount ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}
          >
            <Link className="h-full" href="/panel/customer-cards">
              <Card className="group h-full cursor-pointer border-l-2 border-l-primary transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    Toplam Cari Kart
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl tabular-nums">
                    {customerTotal}
                  </div>
                </CardContent>
              </Card>
            </Link>

            {graySubtractionBusinessGroupCount && (
              <Card className="group h-full cursor-pointer border-l-2 border-l-primary transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    {
                      graySubtractionBusinessGroupCount.graySubtractionBusinessGroup
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl tabular-nums">
                    {graySubtractionBusinessGroupCount.count}
                  </div>
                </CardContent>
              </Card>
            )}

            <Link className="h-full" href="/panel/visits">
              <Card className="group h-full cursor-pointer border-l-2 border-l-primary transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    Toplam Ziyaret
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl tabular-nums">
                    {visitTotal}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="border-l-2 border-l-primary">
              <CardHeader className="pt-4 pb-1">
                <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                  Ziyaret Sıralaması — Satış Temsilcileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {visitRanking.length === 0 ? (
                  <div className="font-mono text-muted-foreground text-sm">
                    —
                  </div>
                ) : (
                  <ol className="space-y-1.5">
                    {visitRanking.map((entry, i) => (
                      <li
                        className="flex items-center gap-2 font-mono text-xs"
                        key={entry.salesRepresentative}
                      >
                        <span className="w-4 shrink-0 text-right text-muted-foreground">
                          {i + 1}.
                        </span>
                        <span className="flex-1 truncate">
                          {entry.salesRepresentative}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {entry.visitCount}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Link href="/panel/customer-cards?color=green">
              <Card className="group cursor-pointer border-l-2 border-l-green-500 transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    <span className="flex flex-col items-start leading-tight">
                      Yeşil
                      <span className="text-[10px] opacity-60">(Biz)</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl text-green-600 tabular-nums">
                    {colorCounts.green}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/panel/customer-cards?color=blue">
              <Card className="group cursor-pointer border-l-2 border-l-blue-500 transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    <span className="flex flex-col items-start leading-tight">
                      Mavi
                      <span className="text-[10px] opacity-60">(M.A.Ö)</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl text-blue-600 tabular-nums">
                    {colorCounts.blue}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/panel/customer-cards?color=orange">
              <Card className="group cursor-pointer border-l-2 border-l-orange-500 transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    <span className="flex flex-col items-start leading-tight">
                      Turuncu
                      <span className="text-[10px] opacity-60">(Y.B)</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl text-orange-500 tabular-nums">
                    {colorCounts.orange}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/panel/customer-cards?color=yellow">
              <Card className="group cursor-pointer border-l-2 border-l-yellow-400 transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    <span className="flex flex-col items-start leading-tight">
                      Sarı
                      <span className="text-[10px] opacity-60">
                        (Gelmeyecek)
                      </span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl text-yellow-600 tabular-nums">
                    {colorCounts.yellow}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/panel/customer-cards?color=purple">
              <Card className="group cursor-pointer border-l-2 border-l-purple-400 transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    <span className="flex flex-col items-start leading-tight">
                      Mor
                      <span className="text-[10px] opacity-60">(Araf)</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl text-purple-500 tabular-nums">
                    {colorCounts.purple}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/panel/customer-cards?color=gray">
              <Card className="group cursor-pointer border-l-2 border-l-gray-400 transition-colors hover:bg-accent">
                <CardHeader className="pt-4 pb-1">
                  <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                    <span className="flex flex-col items-start leading-tight">
                      Gri
                      <span className="text-[10px] opacity-60">(Boş)</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="font-mono font-semibold text-3xl text-gray-500 tabular-nums">
                    {colorCounts.gray}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          <BusinessGroupAlerts groups={businessGroupStats.groups} />
          <Card className="mt-4 border-l-2 border-l-primary/40">
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
                Son Aktivite
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="font-mono text-sm">
                {latestAudit
                  ? (latestAudit.details ??
                    auditAction[latestAudit.action as keyof typeof auditAction])
                  : '—'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
