'use client';

import { DEFAULT_LABELS } from '~/shared/labels/resolve';
import type { ResolvedLabels } from '~/shared/labels/types';
import { api } from '~/trpc/react';

export function useLabels(): ResolvedLabels {
  const { data } = api.label.get.useQuery(undefined, {
    initialData: DEFAULT_LABELS,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? DEFAULT_LABELS;
}
