'use client';

import type { $Enums, CustomerCard } from 'generated/prisma';
import { SearchIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Combobox } from '~/components/ui/combobox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { columnMap } from '~/lib/column-map';
import { DISTRICTS } from '~/shared/constants';
import PositiveControl from './positive-control';

export function FilterControls({
  search,
  positive,
  searchScope,
  onSearch,
  onPositive,
  onSearchScope,
  businessGroupOptions,
  businessGroup,
  salesRepresentativeOptions,
  salesRepresentative,
  onBusinessGroup,
  onSalesRepresentative,
  onDistrict,
  district,
}: {
  search: string;
  onSearch: (search: string) => void;
  positive: 'positive' | 'negative' | 'neutral' | 'all';
  onPositive: (positive: 'positive' | 'negative' | 'neutral' | 'all') => void;
  searchScope: 'all' | keyof CustomerCard;
  onSearchScope: (searchScope: 'all' | keyof CustomerCard) => void;
  businessGroupOptions: string[];
  businessGroup: string;
  salesRepresentativeOptions: string[];
  salesRepresentative: string;
  onBusinessGroup: (businessGroup: string) => void;
  onSalesRepresentative: (salesRepresentative: string) => void;
  onDistrict: (district: '' | $Enums.District) => void;
  district: '' | $Enums.District;
}) {
  const searchScopeComboboxOptions = [
    { key: 'all', label: 'Tümü' },
    ...Object.entries(columnMap.customerCard)
      .filter(
        ([key]) =>
          key !== 'positive' &&
          key !== 'createdAt' &&
          key !== 'updatedAt' &&
          key !== 'id' &&
          key !== 'district' &&
          key !== 'businessGroup' &&
          key !== 'salesRepresentative',
      )
      .map(([key, label]) => {
        return { key, label };
      }),
  ];

  const businessGroupComboboxOptions = [
    { key: '', label: 'Tümü' },
    ...businessGroupOptions.map((businessGroup) => {
      return { key: businessGroup, label: businessGroup };
    }),
  ];
  const salesRepresentativeComboboxOptions = [
    { key: '', label: 'Tümü' },
    ...salesRepresentativeOptions.map((salesRepresentative) => {
      return { key: salesRepresentative, label: salesRepresentative };
    }),
  ];

  const districtComboboxOptions = [
    { value: '', label: 'Tümü' },
    ...DISTRICTS,
  ].map(({ value, label }) => {
    return { key: value, label: label };
  });

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-col items-center sm:flex-row">
        <CardTitle className="mb-2 max-sm:text-lg sm:mr-auto sm:mb-0">
          Filtreler
        </CardTitle>
        <InputGroup className="sm:ml-auto sm:w-75">
          <InputGroupInput
            className="w-50"
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
          onChange={(v) => onSearchScope(v as 'all' | keyof CustomerCard)}
          options={searchScopeComboboxOptions}
          selectedKey={searchScope}
        />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PositiveControl
            id="positive"
            includeAll
            positive={positive}
            setPositive={onPositive}
          />
          <Combobox
            label="İlçe"
            onChange={(v) => onDistrict(v as '' | $Enums.District)}
            options={districtComboboxOptions}
            selectedKey={district}
          />
          <Combobox
            label="Meslek Grubu"
            onChange={(v) => onBusinessGroup(v as string)}
            options={businessGroupComboboxOptions}
            selectedKey={businessGroup}
          />
          <Combobox
            label="Satış Temsilcisi"
            onChange={(v) => onSalesRepresentative(v as string)}
            options={salesRepresentativeComboboxOptions}
            selectedKey={salesRepresentative}
          />
        </div>
      </CardContent>
    </Card>
  );
}
