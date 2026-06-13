import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { auditAction } from '~/lib/enum-map';
import { api } from '~/trpc/server';
import { BusinessGroupAlerts } from '../_components/business-group-alerts';

export default async function DashboardPage() {
  const [
    customerTotal,
    colorCounts,
    visitTotal,
    latestAudit,
    businessGroupStats,
  ] = await Promise.all([
    api.customerCard.getTotal(),
    api.customerCard.getColorCounts(),
    api.visit.getTotal(),
    api.auditLog.getLatest(),
    api.businessGroup.getStats(),
    // api.visit.getRankedVisitsBySalesRepresentative(),
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
          <div className="mb-6">
            <h2 className="font-bold text-3xl tracking-tight">Panel</h2>
            <p className="text-muted-foreground">CRM Panelinize hoş geldiniz</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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

            {/*<Card className="border-l-2 border-l-primary">
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="font-bold text-base text-muted-foreground uppercase tracking-widest">
                Ziyaret Sıralaması — Satış Temsilcileri
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {visitRanking.length === 0 ? (
                <p className="text-muted-foreground text-sm">Veri yok</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4">
                  {[visitRanking.slice(0, 5), visitRanking.slice(5)].map(
                    (col, colIdx) => (
                      <div key={colIdx} className="space-y-1.5">
                        {col.map((item, rowIdx) => (
                          <div
                            key={item.salesRepresentative}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                                {colIdx * 5 + rowIdx + 1}.
                              </span>
                              <span className="truncate text-sm">
                                {item.salesRepresentative}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono font-semibold tabular-nums">
                              {item.visitCount}
                            </span>
                          </div>
                        ))}
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>*/}
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
