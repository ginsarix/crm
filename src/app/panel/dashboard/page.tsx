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
  ]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6">
          <h2 className="font-bold text-3xl tracking-tight">Panel</h2>
          <p className="text-muted-foreground">CRM Panelinize hoş geldiniz</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/panel/customer-cards">
            <Card className="group cursor-pointer border-l-2 border-l-primary transition-colors hover:bg-accent">
              <CardHeader className="pt-4 pb-1">
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
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

          <Link href="/panel/visits">
            <Card className="group cursor-pointer border-l-2 border-l-primary transition-colors hover:bg-accent">
              <CardHeader className="pt-4 pb-1">
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
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
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link href="/panel/customer-cards?color=green">
            <Card className="group cursor-pointer border-l-2 border-l-green-500 transition-colors hover:bg-accent">
              <CardHeader className="pt-4 pb-1">
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
                  Yeşil
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
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
                  Mavi
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
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
                  Turuncu
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="font-mono font-semibold text-3xl text-orange-500 tabular-nums">
                  {colorCounts.orange}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/panel/customer-cards?color=gray">
            <Card className="group cursor-pointer border-l-2 border-l-gray-400 transition-colors hover:bg-accent">
              <CardHeader className="pt-4 pb-1">
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
                  Gri
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
  );
}
