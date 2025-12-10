'use client';

import type { Visit } from 'generated/prisma';
import { SearchIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Combobox } from '~/components/ui/combobox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { columnMap } from '~/lib/column-map';
import ViaControl from './via-control';

export function FilterControls({
  search,
  via,
  searchScope,
  onSearch,
  onVia,
  onSearchScope,
}: {
  search: string;
  onSearch: (search: string) => void;
  via: 'phone' | 'inPerson' | 'email' | 'sms' | 'all';
  onVia: (via: 'phone' | 'inPerson' | 'email' | 'sms' | 'all') => void;
  searchScope: 'all' | keyof Visit;
  onSearchScope: (searchScope: 'all' | keyof Visit) => void;
}) {
  const comboboxOptions = [
    { key: 'all', label: 'Tümü' },
    ...Object.entries(columnMap.visit)
      .filter(
        ([key]) =>
          key !== 'via' &&
          key !== 'createdAt' &&
          key !== 'updatedAt' &&
          key !== 'id' &&
          key !== 'date' &&
          key !== 'time',
      )
      .map(([key, label]) => {
        return { key, label };
      }),
  ];

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-col items-center sm:flex-row">
        <CardTitle className="mb-2 max-sm:text-lg sm:mr-auto sm:mb-0">
          Filtreler
        </CardTitle>
        <InputGroup className="sm:ml-auto sm:w-75">
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
          className="sm:w-50"
          label="Arama Kapsamı"
          onChange={(v) => onSearchScope(v as 'all' | keyof Visit)}
          options={comboboxOptions}
          selectedKey={searchScope}
        />
      </CardHeader>
      <CardContent>
        <ViaControl id="via" includeAll setVia={onVia} via={via} />
      </CardContent>
    </Card>
  );
}
