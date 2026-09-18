'use client';

import { SearchIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Combobox } from '~/components/ui/combobox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import { columnMap } from '~/lib/column-map';

// `user` is a static entity with no field registry, so its labels stay
// hardcoded here rather than routing through the label resolver.
const userFieldLabels: Record<(typeof columnMap.user)[number], string> = {
  id: 'ID',
  name: 'Ad',
  email: 'E-posta',
  emailVerified: 'E-posta Doğrulandı',
  image: 'Profil Resmi',
  createdAt: 'Oluşturulma Tarihi',
  updatedAt: 'Güncellenme Tarihi',
};

export function FilterControls({
  search,
  searchScope,
  onSearch,
  onSearchScope,
}: {
  search: string;
  onSearch: (search: string) => void;
  searchScope: 'all' | (typeof columnMap.user)[number];
  onSearchScope: (searchScope: 'all' | (typeof columnMap.user)[number]) => void;
}) {
  const comboboxOptions = [
    { key: 'all', label: 'Tümü' },
    ...columnMap.user
      .filter(
        (key) =>
          key !== 'emailVerified' &&
          key !== 'createdAt' &&
          key !== 'updatedAt' &&
          key !== 'id' &&
          key !== 'image',
      )
      .map((key) => ({ key, label: userFieldLabels[key] })),
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
          onChange={(v) =>
            onSearchScope(v as 'all' | (typeof columnMap.user)[number])
          }
          options={comboboxOptions}
          selectedKey={searchScope}
        />
      </CardHeader>
    </Card>
  );
}
