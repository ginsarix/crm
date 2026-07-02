'use client';

import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { api } from '~/trpc/react';

const SKELETON_ROWS = ['a', 'b', 'c', 'd', 'e'];

interface AccountVisitsListProps {
  onBack: () => void;
  onNavigate: () => void;
}

export function AccountVisitsList({
  onBack,
  onNavigate,
}: AccountVisitsListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = api.user.getMyVisits.useQuery({ page });

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
        <h3 className="font-semibold text-sm">Oluşturduğum Ziyaretler</h3>
      </div>

      <div className="divide-y rounded-lg border">
        {isLoading &&
          SKELETON_ROWS.map((key) => (
            <div className="p-3" key={key}>
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        {!isLoading && data?.data.length === 0 && (
          <p className="p-4 text-center text-muted-foreground text-sm">
            Henüz ziyaret oluşturmadınız
          </p>
        )}
        {!isLoading &&
          data?.data.map((visit) => (
            <Link
              className="block p-3 text-sm underline-offset-4 hover:bg-accent hover:underline"
              href={`/panel/visits?id=${visit.id}`}
              key={visit.id}
              onClick={onNavigate}
            >
              {new Date(visit.date).toLocaleDateString('tr-TR')} -{' '}
              {visit.customerCard?.name ?? 'İsimsiz Cari Kart'}
            </Link>
          ))}
      </div>

      {data && data.pagination.totalItems > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Sayfa {page} / {data.pagination.totalPages} (
            {data.pagination.totalItems} kayıt)
          </p>
          <div className="flex gap-1">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              size="icon"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              size="icon"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
