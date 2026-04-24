import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface GroupStat {
  name: string;
  total: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
}

interface Props {
  positiveGroups: GroupStat[];
  negativeGroups: GroupStat[];
}

function GroupRow({
  g,
  variant,
}: {
  g: GroupStat;
  variant: "positive" | "negative";
}) {
  const href = `/panel/customer-cards?business_group=${encodeURIComponent(g.name)}`;

  const posWidth = g.total > 0 ? (g.positiveCount / g.total) * 100 : 0;
  const neuWidth = g.total > 0 ? (g.neutralCount / g.total) * 100 : 0;
  const negWidth = g.total > 0 ? (g.negativeCount / g.total) * 100 : 0;

  return (
    <Link
      className="group block rounded px-2 py-2 transition-colors hover:bg-accent"
      href={href}
    >
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm">{g.name}</span>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-mono text-[oklch(0.70_0.15_145)] text-xs tabular-nums">
            +{g.positivePercent}%
          </span>
          <span className="font-mono text-muted-foreground text-xs tabular-nums">
            ~{g.neutralPercent}%
          </span>
          <span className="font-mono text-destructive text-xs tabular-nums">
            -{g.negativePercent}%
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex h-[3px] w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-[oklch(0.70_0.15_145)] transition-all"
          style={{ width: `${posWidth}%` }}
        />
        <div
          className="h-full bg-[oklch(0.75_0.12_95)] transition-all"
          style={{ width: `${neuWidth}%` }}
        />
        <div
          className="h-full bg-destructive transition-all"
          style={{ width: `${negWidth}%` }}
        />
      </div>
    </Link>
  );
}

export function BusinessGroupAlerts({ positiveGroups, negativeGroups }: Props) {
  if (positiveGroups.length === 0 && negativeGroups.length === 0) return null;

  const allGroups = [
    ...positiveGroups.map((g) => ({ g, variant: "positive" as const })),
    ...negativeGroups
      .filter((g) => !positiveGroups.some((p) => p.name === g.name))
      .map((g) => ({ g, variant: "negative" as const })),
  ];

  return (
    <Card className="mt-4 border-l-2 border-l-primary/40">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
          Pozitiflik — Meslek Grupları
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-1">
          {allGroups.map(({ g, variant }) => (
            <GroupRow g={g} key={g.name} variant={variant} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
