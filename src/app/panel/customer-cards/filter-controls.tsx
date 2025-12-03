"use client";

import type { CustomerCard } from "generated/prisma";
import { SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Combobox } from "~/components/ui/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { columnMap } from "~/lib/column-map";
import PositiveControl from "./positive-control";

export function FilterControls({
  search,
  positive,
  searchScope,
  onSearch,
  onPositive,
  onSearchScope,
}: {
  search: string;
  onSearch: (search: string) => void;
  positive: "positive" | "negative" | "neutral" | "all";
  onPositive: (positive: "positive" | "negative" | "neutral" | "all") => void;
  searchScope: "all" | keyof CustomerCard;
  onSearchScope: (searchScope: "all" | keyof CustomerCard) => void;
}) {
  const comboboxOptions = [
    { key: "all", label: "Tümü" },
    ...Object.entries(columnMap.customerCard)
      .filter(
        ([key]) =>
          key !== "positive" &&
          key !== "createdAt" &&
          key !== "updatedAt" &&
          key !== "id" &&
          key !== "district"
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
          onChange={(v) => onSearchScope(v as "all" | keyof CustomerCard)}
          options={comboboxOptions}
          selectedKey={searchScope}
        />
      </CardHeader>
      <CardContent>
        <PositiveControl
          id="positive"
          includeAll
          positive={positive}
          setPositive={onPositive}
        />
      </CardContent>
    </Card>
  );
}
