import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface GroupStat {
  name: string;
  total: number;
  greenCount: number;
  blueCount: number;
  orangeCount: number;
  yellowCount: number;
  purpleCount: number;
  grayCount: number;
  greenPercent: number;
  bluePercent: number;
  orangePercent: number;
  yellowPercent: number;
  purplePercent: number;
  grayPercent: number;
}

interface Props {
  groups: GroupStat[];
}

function GroupRow({ g }: { g: GroupStat }) {
  const href = `/panel/customer-cards?business_group=${encodeURIComponent(g.name)}`;

  return (
    <Link
      className="group block rounded px-2 py-2 transition-colors hover:bg-accent"
      href={href}
    >
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="min-w-0 truncate">{g.name}</span>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-bold font-mono tabular-nums">
            {g.greenCount +
              g.blueCount +
              g.orangeCount +
              g.yellowCount +
              g.purpleCount +
              g.grayCount}{' '}
            /
          </span>
          <div>
            <span className="font-mono text-green-600 tabular-nums">
              {g.greenCount}
            </span>
          </div>
          <span className="font-mono text-blue-600 tabular-nums">
            {g.blueCount}
          </span>
          <span className="font-mono text-orange-500 tabular-nums">
            {g.orangeCount}
          </span>
          <span className="font-mono text-yellow-500 tabular-nums">
            {g.yellowCount}
          </span>
          <span className="font-mono text-purple-500 tabular-nums">
            {g.purpleCount}
          </span>
          <span className="font-mono text-gray-500 tabular-nums">
            {g.grayCount}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex h-[3px] w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${g.greenPercent}%` }}
        />
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${g.bluePercent}%` }}
        />
        <div
          className="h-full bg-orange-500 transition-all"
          style={{ width: `${g.orangePercent}%` }}
        />
        <div
          className="h-full bg-yellow-400 transition-all"
          style={{ width: `${g.yellowPercent}%` }}
        />
        <div
          className="h-full bg-purple-400 transition-all"
          style={{ width: `${g.purplePercent}%` }}
        />
        <div
          className="h-full bg-gray-400 transition-all"
          style={{ width: `${g.grayPercent}%` }}
        />
      </div>
    </Link>
  );
}

export function BusinessGroupAlerts({ groups }: Props) {
  if (groups.length === 0) return null;

  return (
    <Card className="mt-4 border-l-2 border-l-primary/40">
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="font-mono text-base text-muted-foreground uppercase tracking-[0.15em]">
          Renk Dağılımı — Meslek Grupları
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-1">
          {groups.map((g) => (
            <GroupRow g={g} key={g.name} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
