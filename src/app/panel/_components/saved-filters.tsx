'use client';

import { Bookmark, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { api } from '~/trpc/react';

export function SavedFilters({
  page,
  currentFilters,
  onApply,
}: {
  page: 'customerCard' | 'visit';
  currentFilters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const utils = api.useUtils();
  const { data: savedFilters } = api.savedFilter.get.useQuery({ page });

  const createMutation = api.savedFilter.create.useMutation({
    onSuccess: () => {
      utils.savedFilter.get.invalidate({ page });
      setName('');
      toast.success('Filtre kaydedildi');
    },
    onError: () => toast.error('Filtre kaydedilirken hata oluştu'),
  });

  const deleteMutation = api.savedFilter.delete.useMutation({
    onSuccess: () => {
      utils.savedFilter.get.invalidate({ page });
      toast.success('Filtre silindi');
    },
    onError: () => toast.error('Filtre silinirken hata oluştu'),
  });

  const hasActiveFilters = Object.values(currentFilters).some((v) => v !== '');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed, page, filters: currentFilters });
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <Bookmark className="size-3.5" />
          Kayıtlı Filtreler
          {!!savedFilters?.length && (
            <span className="text-muted-foreground">
              ({savedFilters.length})
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Kayıtlı Filtreler
            </p>
            {savedFilters?.length ? (
              <ul className="flex flex-col gap-0.5">
                {savedFilters.map((filter) => (
                  <li className="flex items-center gap-1" key={filter.id}>
                    <button
                      className="flex-1 truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onApply(filter.filters as Record<string, string>);
                        setOpen(false);
                      }}
                      type="button"
                    >
                      {filter.name}
                    </button>
                    <Button
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate({ id: filter.id })}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Henüz kayıtlı filtre yok
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 border-t pt-3">
            <Input
              className="h-8 text-sm"
              disabled={!hasActiveFilters}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder={
                hasActiveFilters ? 'Filtre adı' : 'Önce filtre seçin'
              }
              value={name}
            />
            <Button
              disabled={
                !hasActiveFilters || !name.trim() || createMutation.isPending
              }
              onClick={handleSave}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
