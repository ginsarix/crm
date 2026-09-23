'use client';

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useLabels } from '~/hooks/use-labels';
import { labelCompose } from '~/shared/labels/compose';
import type { ResolvedPageSizes } from '~/shared/page-sizes/types';
import BusinessGroupsTable from './business-groups-table';
import { GeneralCard } from './general-card';
import { LabelsCard } from './labels-card';
import { PageSizesCard } from './page-sizes-card';
import SaleRepresentativesTable from './sale-representatives-table';

const TAB_SLUGS = [
  'general',
  'sales-representatives',
  'business-groups',
  'labels',
  'page-sizes',
] as const;

type TabSlug = (typeof TAB_SLUGS)[number];

const isTabSlug = (value: string | null): value is TabSlug =>
  value !== null && TAB_SLUGS.includes(value as TabSlug);

export function SettingsTabs({ pageSizes }: { pageSizes: ResolvedPageSizes }) {
  const labels = useLabels();
  const searchParams = useSearchParams();
  const param = searchParams.get('tab');
  const active: TabSlug = isTabSlug(param) ? param : 'general';

  /**
   * `window.history.replaceState` rather than `router.replace`: this is the
   * documented shallow-routing path for this Next version, and it syncs with
   * `useSearchParams` without an RSC round-trip. `replaceState` rather than
   * `pushState` so tab switches do not fill the back button — Back should
   * leave the settings page, not walk the tabs.
   */
  const handleChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', value);
    window.history.replaceState(null, '', `?${next.toString()}`);
  };

  return (
    <Tabs onValueChange={handleChange} value={active}>
      <TabsList className="mb-4">
        <TabsTrigger value="general">Genel</TabsTrigger>
        <TabsTrigger value="sales-representatives">
          {labelCompose.tableTitle(labels.entity.salesRepresentative)}
        </TabsTrigger>
        <TabsTrigger value="business-groups">
          {labelCompose.tableTitle(labels.entity.businessGroup)}
        </TabsTrigger>
        <TabsTrigger value="labels">Etiketler</TabsTrigger>
        <TabsTrigger value="page-sizes">Sayfa Boyutu</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralCard />
      </TabsContent>

      <TabsContent value="sales-representatives">
        <SaleRepresentativesTable pageSize={pageSizes.salesRepresentative} />
      </TabsContent>

      <TabsContent value="business-groups">
        <BusinessGroupsTable />
      </TabsContent>

      <TabsContent value="labels">
        <LabelsCard />
      </TabsContent>

      <TabsContent value="page-sizes">
        <PageSizesCard pageSizes={pageSizes} />
      </TabsContent>
    </Tabs>
  );
}
