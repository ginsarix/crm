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
import { api } from '~/trpc/react';
import { SavedFilters } from '../_components/saved-filters';
import ViaControl from './via-control';

type VisitSearchScope = 'all' | keyof typeof columnMap.visit;

type VisitEmptyField = '' | keyof typeof columnMap.visit;

export function FilterControls({
  search,
  via,
  searchScope,
  salesRepresentativeId,
  emptyField,
  currentFilters,
  onSearch,
  onVia,
  onSearchScope,
  onSalesRepresentativeId,
  onEmptyField,
  onApplyPreset,
}: {
  search: string;
  onSearch: (search: string) => void;
  via: 'phone' | 'inPerson' | 'email' | 'sms' | 'all';
  onVia: (via: 'phone' | 'inPerson' | 'email' | 'sms' | 'all') => void;
  searchScope: VisitSearchScope;
  onSearchScope: (searchScope: VisitSearchScope) => void;
  salesRepresentativeId: string;
  onSalesRepresentativeId: (id: string) => void;
  emptyField: VisitEmptyField;
  onEmptyField: (emptyField: VisitEmptyField) => void;
  currentFilters: Record<string, string>;
  onApplyPreset: (filters: Record<string, string>) => void;
}) {
  const { data: salesRepresentatives } = api.salesRepresentative.get.useQuery();
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

  const emptyFieldComboboxOptions = [
    { key: '', label: 'Kapalı' },
    ...Object.entries(columnMap.visit)
      .filter(
        ([key]) =>
          key !== 'id' &&
          key !== 'date' &&
          key !== 'createdAt' &&
          key !== 'updatedAt',
      )
      .map(([key, label]) => ({ key, label })),
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
          onChange={(v) => onSearchScope(v as VisitSearchScope)}
          options={comboboxOptions}
          selectedKey={searchScope}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ViaControl id="via" includeAll setVia={onVia} via={via} />
        <Combobox
          className="sm:w-56"
          label="Satış Temsilcisi"
          onChange={onSalesRepresentativeId}
          options={[
            { key: '', label: 'Tümü' },
            ...(salesRepresentatives?.map((sr) => ({
              key: sr.id,
              label: sr.name,
            })) ?? []),
          ]}
          selectedKey={salesRepresentativeId}
        />
        <Combobox
          className="sm:w-40"
          label="Boş Alan"
          onChange={(v) => onEmptyField(v as VisitEmptyField)}
          options={emptyFieldComboboxOptions}
          selectedKey={emptyField}
        />
        <SavedFilters
          currentFilters={currentFilters}
          onApply={onApplyPreset}
          page="visit"
        />
      </CardContent>
    </Card>
  );
}
