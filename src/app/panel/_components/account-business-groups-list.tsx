'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useLabels } from '~/hooks/use-labels';
import { labelCompose } from '~/shared/labels/compose';

interface AccountBusinessGroupsListProps {
  businessGroups: { id: string; name: string }[];
  onBack: () => void;
}

export function AccountBusinessGroupsList({
  businessGroups,
  onBack,
}: AccountBusinessGroupsListProps) {
  const labels = useLabels();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          className="cursor-pointer"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold text-sm">
          Atanmış {labelCompose.tableTitle(labels.entity.businessGroup)}
        </h3>
      </div>

      <div className="divide-y rounded-lg border">
        {businessGroups.length === 0 && (
          <p className="p-4 text-center text-muted-foreground text-sm">
            Atanmış meslek grubu yok
          </p>
        )}
        {businessGroups.map((group) => (
          <div className="p-3 text-sm" key={group.id}>
            {group.name}
          </div>
        ))}
      </div>
    </div>
  );
}
