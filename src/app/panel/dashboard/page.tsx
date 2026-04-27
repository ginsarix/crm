import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { auditAction } from "~/lib/enum-map";
import { api } from "~/trpc/server";
import { BusinessGroupAlerts } from "../_components/business-group-alerts";
import { ChartPie } from "../_components/pie-chart";

export default async function DashboardPage() {
  const [
    customerTotal,
    positivesCount,
    negativesCount,
    visitTotal,
    latestAudit,
    businessGroupStats,
  ] = await Promise.all([
    api.customerCard.getTotal(),
    api.customerCard.getPositivesCount(),
    api.customerCard.getNegativesCount(),
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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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

          <Link href="/panel/customer-cards?positivity=positive">
            <Card className="group cursor-pointer border-l-2 border-l-[oklch(0.70_0.15_145)] transition-colors hover:bg-accent">
              <CardHeader className="pt-4 pb-1">
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
                  Pozitif Cari Kart
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="font-mono font-semibold text-3xl text-[oklch(0.70_0.15_145)] tabular-nums">
                  {positivesCount}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/panel/customer-cards?positivity=negative">
            <Card className="group cursor-pointer border-l-2 border-l-destructive transition-colors hover:bg-accent">
              <CardHeader className="pt-4 pb-1">
                <CardTitle className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
                  Negatif Cari Kart
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="font-mono font-semibold text-3xl text-destructive tabular-nums">
                  {negativesCount}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        <BusinessGroupAlerts
          negativeGroups={businessGroupStats.negativeGroups}
          positiveGroups={businessGroupStats.positiveGroups}
        />
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
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
