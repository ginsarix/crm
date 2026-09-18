'use client';

import { SearchIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';

export function FilterControls({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (search: string) => void;
}) {
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
      </CardContent>
    </Card>
  );
}
