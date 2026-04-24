"use client";

import type { PaginationState, SortingState } from "@tanstack/react-table";
import type { $Enums, CustomerCard } from "generated/prisma";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import { DistrictValidation } from "~/shared/zod-schemas/district";
import { api } from "~/trpc/react";
import { DataTable } from "../../_components/data-table";
import { createColumns } from "./columns";
import { CreateCustomerCardDialog } from "./create-dialog";
import { FilterControls } from "./filter-controls";
import { ViewCustomerCardDialog } from "./view-dialog";

const PositivityValidation = z.enum(["positive", "negative", "neutral", "all"]);

export function CustomerCardsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [selectedCustomerCard, setSelectedCustomerCard] =
    useState<CustomerCard | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Local state for the search input — avoids sluggish typing caused by URL-roundtrip on every keystroke
  const urlSearch = searchParams.get("search") ?? "";
  const lastWrittenSearch = useRef(urlSearch);
  const [search, setSearch] = useState(urlSearch);

  // Sync URL → local only on external navigation (back/forward), not on our own writes
  useEffect(() => {
    if (urlSearch !== lastWrittenSearch.current) {
      lastWrittenSearch.current = urlSearch;
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Derive remaining filter values directly from URL
  const positive =
    PositivityValidation.safeParse(searchParams.get("positivity")).data ??
    "all";
  const searchScope = (searchParams.get("search_scope") ??
    "all") as "all" | keyof CustomerCard;
  const businessGroup = searchParams.get("business_group") ?? "";
  const salesRepresentative = searchParams.get("sales_representative") ?? "";
  const district = (DistrictValidation.safeParse(searchParams.get("district"))
    .data ?? "") as "" | $Enums.District;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Stable ref so the debounce effect doesn't re-fire when searchParams changes
  const updateParamRef = useRef(updateParam);
  useEffect(() => {
    updateParamRef.current = updateParam;
  });

  // Debounce search → URL so the query only fires after the user pauses typing
  useEffect(() => {
    const timer = setTimeout(() => {
      lastWrittenSearch.current = search;
      updateParamRef.current("search", search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: businessGroupOptions } = api.businessGroup.get.useQuery();
  const { data: salesRepresentativeOptions } =
    api.salesRepresentative.get.useQuery();

  const { data, isLoading } = api.customerCard.get.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: {
      search: urlSearch,
      positive,
      searchScope,
      businessGroup,
      salesRepresentative,
      district,
    },
    sorting,
  });

  const handleViewCustomerCard = (customerCard: CustomerCard) => {
    setSelectedCustomerCard(customerCard);
    setViewDialogOpen(true);
  };

  const columns = createColumns(handleViewCustomerCard);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls
            businessGroup={businessGroup}
            businessGroupOptions={
              businessGroupOptions?.map(
                (businessGroup) => businessGroup.name,
              ) ?? []
            }
            district={district}
            onBusinessGroup={(v) => updateParam("business_group", v)}
            onDistrict={(v) => updateParam("district", v)}
            onPositive={(v) => updateParam("positivity", v === "all" ? "" : v)}
            onSalesRepresentative={(v) =>
              updateParam("sales_representative", v)
            }
            onSearch={setSearch}
            onSearchScope={(v) =>
              updateParam("search_scope", v === "all" ? "" : v)
            }
            positive={positive}
            salesRepresentative={salesRepresentative}
            salesRepresentativeOptions={
              salesRepresentativeOptions?.map(
                (salesRepresentative) => salesRepresentative.name,
              ) ?? []
            }
            search={search}
            searchScope={searchScope}
          />
        </div>
        <Card className={cn(!isLoading && "rounded-b-none border-b-0")}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">Cari Kartlar</CardTitle>
            <div className="ml-auto">
              <CreateCustomerCardDialog />
            </div>
          </CardHeader>
        </Card>
        {isLoading ? (
          <div className="flex justify-center">
            <Spinner className="mt-10 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="customer-cards"
            />
          </div>
        )}

        {selectedCustomerCard && (
          <ViewCustomerCardDialog
            customerCard={selectedCustomerCard}
            onOpenChange={setViewDialogOpen}
            onUpdate={(updatedCustomerCard) =>
              setSelectedCustomerCard(updatedCustomerCard)
            }
            open={viewDialogOpen}
          />
        )}
      </div>
    </div>
  );
}
