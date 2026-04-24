'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Label } from '~/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { cn } from '~/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  sorting?: SortingState;
  pagination?: PaginationState;
  setSorting?: OnChangeFn<SortingState>;
  setPagination?: OnChangeFn<PaginationState>;
  className?: string;
  pageCount?: number;
  tableId?: string; // Unique ID for localStorage persistence
}

function getStorageKey(tableId: string) {
  return `table-columns-${tableId}`;
}

function loadColumnVisibility(tableId: string): VisibilityState {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(getStorageKey(tableId));
    if (stored) {
      return JSON.parse(stored) as VisibilityState;
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

function saveColumnVisibility(tableId: string, visibility: VisibilityState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(visibility));
  } catch {
    // Ignore storage errors
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  pagination,
  setSorting,
  setPagination,
  className,
  pageCount = -1,
  tableId = 'default',
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => loadColumnVisibility(tableId),
  );

  // Persist column visibility changes to localStorage
  useEffect(() => {
    saveColumnVisibility(tableId, columnVisibility);
  }, [tableId, columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      pagination,
      columnVisibility,
    },
    manualPagination: true, // Server-side pagination
    manualSorting: true, // Server-side sorting
    getCoreRowModel: getCoreRowModel(),
  });

  // Get all columns that can be toggled (exclude actions column)
  const toggleableColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== 'undefined' && column.getCanHide(),
    );

  return (
    <div className="flex flex-col">
      {/* Column Selector */}
      <div className="flex justify-end border-x border-t bg-card px-4 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" size="sm" variant="outline">
              <Columns3 className="h-4 w-4" />
              Kolonlar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[400px] w-[200px] overflow-y-auto"
          >
            <DropdownMenuLabel>Görünür Kolonlar</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-2 p-2">
              {toggleableColumns.map((column) => {
                const header = column.columnDef.header;
                const columnName =
                  typeof header === 'string'
                    ? header
                    : column.id.charAt(0).toUpperCase() + column.id.slice(1);

                return (
                  <div className="flex items-center gap-2" key={column.id}>
                    <Checkbox
                      checked={column.getIsVisible()}
                      id={`column-${column.id}`}
                      onCheckedChange={(checked) =>
                        column.toggleVisibility(!!checked)
                      }
                    />
                    <Label
                      className="cursor-pointer font-normal text-sm"
                      htmlFor={`column-${column.id}`}
                    >
                      {columnName}
                    </Label>
                  </div>
                );
              })}
            </div>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                className="w-full"
                onClick={() => {
                  table.toggleAllColumnsVisible(true);
                }}
                size="sm"
                variant="ghost"
              >
                Tümünü Göster
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div
        className={cn(
          'overflow-hidden rounded-lg rounded-t-none border bg-card',
          className,
          pagination && setPagination && 'rounded-b-none',
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          className={cn(
                            'flex w-full cursor-pointer select-none items-center gap-2',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <span className="ml-auto">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </span>
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const positive = (row.original as Record<string, unknown>)
                  .positive as
                  | 'negative'
                  | 'neutral'
                  | 'positive'
                  | null
                  | undefined;
                return (
                  <TableRow
                    className={cn(
                      positive === 'positive' &&
                        'bg-green-900/80 hover:bg-green-900/90',
                      positive === 'negative' &&
                        'bg-red-900/80 hover:bg-red-900/90',
                      positive === 'neutral' &&
                        'bg-yellow-900/80 hover:bg-yellow-900/90',
                    )}
                    data-state={row.getIsSelected() && 'selected'}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center"
                  colSpan={table.getVisibleLeafColumns().length}
                >
                  Sonuç bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && setPagination && (
        <div className="flex items-center justify-between rounded-b-lg border-x border-b bg-card px-4 py-3">
          <span className="text-muted-foreground text-sm">
            Sayfa {pagination.pageIndex + 1}
            {pageCount > 0 && ` / ${pageCount}`}
          </span>
          <div className="flex gap-2">
            <Button
              className="cursor-pointer"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Önceki
            </Button>
            <Button
              className="cursor-pointer"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size="sm"
              variant="outline"
            >
              Sonraki
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
