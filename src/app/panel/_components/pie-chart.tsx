'use client';

import { Pie, PieChart } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart';
import { cn } from '~/lib/utils';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function ChartPie({
  data,
  title,
  dataKey,
  nameKey,
  description,
  className,
}: {
  data: Record<string, unknown>[];
  title: string;
  dataKey: string;
  nameKey: string;
  description: string;
  className?: string;
}) {
  const chartConfig: ChartConfig = {};
  const chartData = data.map((item, index) => {
    const name = String(item[nameKey]);
    const cssKey = `item-${index}`;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    chartConfig[cssKey] = {
      label: name,
      color,
    };
    return {
      ...item,
      [nameKey]: cssKey,
      fill: `var(--color-${cssKey})`,
    };
  });

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          className="mx-auto aspect-square max-h-[300px]"
          config={chartConfig}
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey={nameKey} />}
            />
            <Pie data={chartData} dataKey={dataKey} nameKey={nameKey} />
            <ChartLegend
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
              content={<ChartLegendContent nameKey={nameKey} />}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
