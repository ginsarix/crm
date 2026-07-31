'use client';

import type { $Enums, CustomerCard } from 'generated/prisma';
import { SearchIcon } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Combobox } from '~/components/ui/combobox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { columnMap } from '~/lib/column-map';
import { createLocaleSorter } from '~/lib/utils';
import {
  AUTHORIZATION_DOCUMENTS_SELECT_MAP,
  DISTRICTS_SELECT_MAP,
  STATUSES_SELECT_MAP,
  VOTES_SELECT_MAP,
} from '~/shared/constants';
import ColorControl from './color-control';

export function FilterControls({
  search,
  color,
  searchScope,
  onSearch,
  onColor,
  onSearchScope,
  businessGroupOptions,
  businessGroup,
  salesRepresentativeOptions,
  salesRepresentative,
  onBusinessGroup,
  onSalesRepresentative,
  onDistrict,
  district,
  status,
  onStatus,
  authorizationDocument,
  onAuthorizationDocument,
  vote,
  onVote,
  emptyField,
  onEmptyField,
  onReset,
}: {
  search: string;
  onSearch: (search: string) => void;
  color: 'green' | 'blue' | 'orange' | 'yellow' | 'gray' | 'purple' | 'all';
  onColor: (
    color: 'green' | 'blue' | 'orange' | 'yellow' | 'gray' | 'purple' | 'all',
  ) => void;
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
  status: '' | '__null__' | $Enums.Status;
  onStatus: (status: '' | '__null__' | $Enums.Status) => void;
  authorizationDocument: '' | '__null__' | $Enums.AuthorizationDocument;
  onAuthorizationDocument: (
    authorizationDocument: '' | '__null__' | $Enums.AuthorizationDocument,
  ) => void;
  vote: '' | '__null__' | $Enums.Vote;
  onVote: (vote: '' | '__null__' | $Enums.Vote) => void;
  emptyField: '' | keyof CustomerCard;
  onEmptyField: (emptyField: '' | keyof CustomerCard) => void;
  onReset: () => void;
}) {
  const searchScopeComboboxOptions = [
    { key: 'all', label: 'Tümü' },
    ...Object.entries(columnMap.customerCard)
      .filter(
        ([key]) =>
          key !== 'color' &&
          key !== 'status' &&
          key !== 'authorizationDocument' &&
          key !== 'vote' &&
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
    ...businessGroupOptions
      .map((businessGroup) => {
        return { key: businessGroup, label: businessGroup };
      })
      .sort(createLocaleSorter('label')),
  ];
  const salesRepresentativeComboboxOptions = [
    { key: '', label: 'Tümü' },
    ...salesRepresentativeOptions.map((salesRepresentative) => {
      return { key: salesRepresentative, label: salesRepresentative };
    }),
  ];

  const districtComboboxOptions = [
    { value: '', label: 'Tümü' },
    ...DISTRICTS_SELECT_MAP,
  ].map(({ value, label }) => {
    return { key: value, label: label };
  });

  const statusComboboxOptions = [
    { key: '', label: 'Tümü' },
    { key: '__null__', label: 'Boş' },
    ...STATUSES_SELECT_MAP.map(({ value, label }) => ({ key: value, label })),
  ];

  const authorizationDocumentComboboxOptions = [
    { key: '', label: 'Tümü' },
    { key: '__null__', label: 'Boş' },
    ...AUTHORIZATION_DOCUMENTS_SELECT_MAP.map(({ value, label }) => ({
      key: value,
      label,
    })),
  ];

  const voteComboboxOptions = [
    { key: '', label: 'Tümü' },
    { key: '__null__', label: 'Boş' },
    ...VOTES_SELECT_MAP.map(({ value, label }) => ({ key: value, label })),
  ];

  const emptyFieldComboboxOptions = [
    { key: '', label: 'Kapalı' },
    ...Object.entries(columnMap.customerCard)
      .filter(
        ([key]) =>
          key !== 'id' &&
          key !== 'createdAt' &&
          key !== 'updatedAt' &&
          key !== 'color',
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
          <ColorControl
            color={color}
            id="color"
            includeAll
            setColor={onColor}
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
          <Combobox
            label="Durum"
            onChange={(v) => onStatus(v as '' | $Enums.Status)}
            options={statusComboboxOptions}
            selectedKey={status}
          />
          <Combobox
            label="Yetki Belge"
            onChange={(v) =>
              onAuthorizationDocument(v as '' | $Enums.AuthorizationDocument)
            }
            options={authorizationDocumentComboboxOptions}
            selectedKey={authorizationDocument}
          />
          <Combobox
            label="Oy"
            onChange={(v) => onVote(v as '' | $Enums.Vote)}
            options={voteComboboxOptions}
            selectedKey={vote}
          />
          <Combobox
            label="Boş Alan"
            onChange={(v) => onEmptyField(v as '' | keyof CustomerCard)}
            options={emptyFieldComboboxOptions}
            selectedKey={emptyField}
          />
          <Button
            className="self-end"
            onClick={onReset}
            size="sm"
            type="button"
            variant="ghost"
          >
            Filtreleri Sıfırla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
