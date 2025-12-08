import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { auditAction } from '~/lib/enum-map';
import { api } from '~/trpc/server';
import { ChartPie } from '../_components/pie-chart';

export default async function DashboardPage() {
  const [
    customerTotal,
    positivesCount,
    negativesCount,
    visitTotal,
    latestAudit,
    customerCardPositives,
  ] = await Promise.all([
    api.customerCard.getTotal(),
    api.customerCard.getPositivesCount(),
    api.customerCard.getNegativesCount(),
    api.visit.getTotal(),
    api.auditLog.getLatest(),
    api.salesRepresentative.customerCardPositives(),
  ]);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6">
          <h2 className="font-bold text-3xl tracking-tight">Panel</h2>
          <p className="text-muted-foreground">CRM Panelinize hoş geldiniz</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex pb-2">
              <CardTitle className="font-medium text-sm">
                Toplam Cari Kart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{customerTotal}</div>
              <p className="text-muted-foreground text-xs">
                Sistemdeki toplam cari kart sayısı
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex pb-2">
              <CardTitle className="font-medium text-sm">
                Toplam Ziyaret
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{visitTotal}</div>
              <p className="text-muted-foreground text-xs">
                Sistemdeki toplam ziyaret sayısı
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex pb-2">
              <CardTitle className="font-medium text-sm">
                Pozitif Cari Kart Sayısı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{positivesCount}</div>
              <p className="text-muted-foreground text-xs">
                Pozitif cari kart sayısı
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="font-medium text-sm">
                Negatif Cari Kart Sayısı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{negativesCount}</div>
              <p className="text-muted-foreground text-xs">
                Negatif cari kart sayısı
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>En son aktivite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">
              {
                // show custom details if available, otherwise the action text, or 'no activity' if nothing exists
                latestAudit
                  ? (latestAudit.details ??
                    auditAction[latestAudit.action as keyof typeof auditAction])
                  : 'Aktivite bulunamadı'
              }
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChartPie
            className="mt-6"
            data={customerCardPositives}
            dataKey="customerCardCount"
            description="Pozitif bazlı satış temsilcileri grafiği"
            nameKey="salesRepresentative"
            title="Pozitif Bazlı Satış Temsilcileri"
          />
        </div>
      </div>
    </div>
  );
}
