'use client';

import type { User } from 'generated/prisma';
import { SearchIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Combobox } from '~/components/ui/combobox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { columnMap } from '~/lib/column-map';

export function FilterControls({
  search,
  searchScope,
  onSearch,
  onSearchScope,
}: {
  search: string;
  onSearch: (search: string) => void;
  searchScope: 'all' | keyof User;
  onSearchScope: (searchScope: 'all' | keyof User) => void;
}) {
  const comboboxOptions = [
    { key: 'all', label: 'Tümü' },
    ...Object.entries(columnMap.user)
      .filter(
        ([key]) =>
          key !== 'emailVerified' &&
          key !== 'createdAt' &&
          key !== 'updatedAt' &&
          key !== 'id' &&
          key !== 'image',
      )
      .map(([key, label]) => {
        return { key, label };
      }),
  ];

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center">
        <CardTitle className="mr-auto">Filtreler</CardTitle>
        <InputGroup className="ml-auto w-50">
          <InputGroupInput
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ara"
            type="search"
            value={search}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <Combobox
          label="Arama Kapsamı"
          onChange={(v) => onSearchScope(v as 'all' | keyof User)}
          options={comboboxOptions}
          selectedKey={searchScope}
        />
      </CardHeader>
    </Card>
  );
}
