'use client';

import { SearchIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Combobox } from '~/components/ui/combobox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { columnMap } from '~/lib/column-map';

type BusinessGroupCardSearchScope =
  | 'all'
  | keyof typeof columnMap.businessGroupCard;

export function FilterControls({
  search,
  searchScope,
  onSearch,
  onSearchScope,
}: {
  search: string;
  onSearch: (search: string) => void;
  searchScope: BusinessGroupCardSearchScope;
  onSearchScope: (searchScope: BusinessGroupCardSearchScope) => void;
}) {
  const comboboxOptions = [
    { key: 'all', label: 'Tümü' },
    ...Object.entries(columnMap.businessGroupCard)
      .filter(
        ([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt',
      )
      .map(([key, label]) => ({ key, label })),
  ];

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-col items-center sm:flex-row">
        <CardTitle className="mb-2 max-sm:text-lg sm:mr-auto sm:mb-0">
          Filtreler
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:w-75">
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
          className="sm:w-56"
          label="Arama Kapsamı"
          onChange={(v) => onSearchScope(v as BusinessGroupCardSearchScope)}
          options={comboboxOptions}
          selectedKey={searchScope}
        />
      </CardContent>
    </Card>
  );
}
