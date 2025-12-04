'use client';

import { SearchIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  auditAction,
  resourceType as resourceTypeLabels,
} from '~/lib/enum-map';
import { api } from '~/trpc/react';

export function FilterControls({
  search,
  action,
  resourceType,
  result,
  onSearch,
  onAction,
  onResourceType,
  onResult,
}: {
  search: string;
  onSearch: (search: string) => void;
  action: string;
  onAction: (action: string) => void;
  resourceType: string;
  onResourceType: (resourceType: string) => void;
  result: 'SUCCESS' | 'FAILURE' | 'all';
  onResult: (result: 'SUCCESS' | 'FAILURE' | 'all') => void;
}) {
  const { data: actions } = api.auditLog.getDistinctActions.useQuery();
  const { data: resourceTypes } =
    api.auditLog.getDistinctResourceTypes.useQuery();

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center">
        <CardTitle className="mr-auto">Filtreler</CardTitle>
        <InputGroup className="ml-auto w-64">
          <InputGroupInput
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ara..."
            type="search"
            value={search}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px]">
            <Select
              onValueChange={(v) => onAction(v === 'all' ? '' : v)}
              value={action || 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder="İşlem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm İşlemler</SelectItem>
                {actions?.map((a) => (
                  <SelectItem key={a} value={a}>
                    {auditAction[a as keyof typeof auditAction] ?? a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <Select
              onValueChange={(v) => onResourceType(v === 'all' ? '' : v)}
              value={resourceType || 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kaynak Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                {resourceTypes?.map((rt) => (
                  <SelectItem key={rt} value={rt}>
                    {resourceTypeLabels[
                      rt as keyof typeof resourceTypeLabels
                    ] ?? rt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <Select
              onValueChange={(v) =>
                onResult(v as 'SUCCESS' | 'FAILURE' | 'all')
              }
              value={result}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sonuç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sonuçlar</SelectItem>
                <SelectItem value="SUCCESS">Başarılı</SelectItem>
                <SelectItem value="FAILURE">Başarısız</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
