import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { auditAction } from '~/lib/enum-map';
import { api } from '~/trpc/server';

export default async function DashboardPage() {
  const [customerTotal, visitTotal, latestAudit] = await Promise.all([
    api.customerCard.getTotal(),
    api.visit.getTotal(),
    api.auditLog.getLatest(),
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
                Toplam Müşteri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{customerTotal}</div>
              <p className="text-muted-foreground text-xs">
                Sistemdeki toplam müşterilerin sayısı
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
                Positive Cards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">0</div>
              <p className="text-muted-foreground text-xs">
                Cards marked positive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <CardTitle className="font-medium text-sm">
                Negative Cards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">0</div>
              <p className="text-muted-foreground text-xs">
                Cards marked negative
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>En son aktivite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-sm">
                {
                  // show custom details if available, otherwise the action text, or 'no activity' if nothing exists
                  latestAudit
                    ? (latestAudit.details ??
                      auditAction[
                        latestAudit.action as keyof typeof auditAction
                      ])
                    : 'Aktivite bulunamadı'
                }
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-sm">
                Statistics will appear here
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
