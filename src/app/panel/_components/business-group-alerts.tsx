import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface GroupStat {
  name: string;
  total: number;
  positivePercent: number;
  negativePercent: number;
}

interface Props {
  positiveGroups: GroupStat[];
  negativeGroups: GroupStat[];
}

function GroupRow({
  name,
  percent,
  variant,
}: {
  name: string;
  percent: number;
  variant: "positive" | "negative";
}) {
  const href = `/panel/customer-cards?business_group=${encodeURIComponent(name)}`;
  const barColor =
    variant === "positive" ? "bg-[oklch(0.70_0.15_145)]" : "bg-destructive";
  const textColor =
    variant === "positive" ? "text-[oklch(0.70_0.15_145)]" : "text-destructive";

  return (
    <Link
      className="group block rounded px-2 py-2 transition-colors hover:bg-accent"
      href={href}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm">{name}</span>
        <span
          className={`font-medium font-mono text-sm tabular-nums ${textColor}`}
        >
          {percent}%
        </span>
      </div>
      <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </Link>
  );
}

function AlertCard({
  title,
  groups,
  percentKey,
  variant,
  borderClass,
}: {
  title: string;
  groups: GroupStat[];
  percentKey: "positivePercent" | "negativePercent";
  variant: "positive" | "negative";
  borderClass: string;
}) {
  return (
    <Card className={`${borderClass} border-l-2`}>
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {groups.length === 0 ? (
          <p className="font-mono text-muted-foreground text-sm">—</p>
        ) : (
          <div className="space-y-1">
            {groups.map((g) => (
              <GroupRow
                key={g.name}
                name={g.name}
                percent={g[percentKey]}
                variant={variant}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BusinessGroupAlerts({ positiveGroups, negativeGroups }: Props) {
  if (positiveGroups.length === 0 && negativeGroups.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <AlertCard
        borderClass="border-l-[oklch(0.70_0.15_145)]"
        groups={positiveGroups}
        percentKey="positivePercent"
        title="Yüksek Pozitif — Meslek Grupları"
        variant="positive"
      />
      <AlertCard
        borderClass="border-l-destructive"
        groups={negativeGroups}
        percentKey="negativePercent"
        title="Yüksek Negatif — Meslek Grupları"
        variant="negative"
      />
    </div>
  );
}
