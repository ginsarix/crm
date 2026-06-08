'use client';

import {
  type ColumnDef,
  type ColumnSizingState,
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
  tableId?: string;
  defaultColumnVisibility?: VisibilityState;
}

function getVisibilityKey(tableId: string) {
  return `table-columns-${tableId}`;
}

function getSizingKey(tableId: string) {
  return `table-sizing-${tableId}`;
}

function loadColumnVisibility(
  tableId: string,
  defaults: VisibilityState = {},
): VisibilityState {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const stored = localStorage.getItem(getVisibilityKey(tableId));
    if (stored) {
      return { ...defaults, ...(JSON.parse(stored) as VisibilityState) };
    }
  } catch {
    // ignore
  }
  return { ...defaults };
}

function saveColumnVisibility(tableId: string, visibility: VisibilityState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getVisibilityKey(tableId), JSON.stringify(visibility));
  } catch {
    // ignore
  }
}

function loadColumnSizing(tableId: string): ColumnSizingState {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(getSizingKey(tableId));
    if (stored) return JSON.parse(stored) as ColumnSizingState;
  } catch {
    // ignore
  }
  return {};
}

function saveColumnSizing(tableId: string, sizing: ColumnSizingState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getSizingKey(tableId), JSON.stringify(sizing));
  } catch {
    // ignore
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
  defaultColumnVisibility = {},
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => loadColumnVisibility(tableId, defaultColumnVisibility),
  );

  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadColumnSizing(tableId),
  );

  useEffect(() => {
    saveColumnVisibility(tableId, columnVisibility);
  }, [tableId, columnVisibility]);

  useEffect(() => {
    saveColumnSizing(tableId, columnSizing);
  }, [tableId, columnSizing]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    columnResizeMode: 'onChange',
    defaultColumn: {
      size: 180,
      minSize: 60,
      maxSize: 600,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    state: {
      sorting,
      pagination,
      columnVisibility,
      columnSizing,
    },
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

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
          'overflow-x-auto rounded-lg rounded-t-none border bg-card',
          className,
          pagination && setPagination && 'rounded-b-none',
        )}
      >
        <Table
          style={{
            width: `max(100%, ${table.getTotalSize()}px)`,
            tableLayout: 'fixed',
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    className="overflow-hidden"
                    key={header.id}
                    style={{
                      width: `${(header.getSize() / table.getTotalSize()) * 100}%`,
                      position: 'relative',
                    }}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex w-full cursor-pointer select-none items-center gap-2"
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
                    {/* Resize handle */}
                    {header.column.getCanResize() && (
                      <div
                        className="absolute top-0 right-0 z-10 flex h-full w-4 cursor-col-resize touch-none select-none items-center justify-center"
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      >
                        <span
                          className={cn(
                            'h-[60%] w-px rounded-full transition-colors',
                            header.column.getIsResizing()
                              ? 'bg-primary'
                              : 'bg-border group-hover:bg-muted-foreground',
                          )}
                        />
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const color = (row.original as Record<string, unknown>).color as
                  | 'green'
                  | 'blue'
                  | 'orange'
                  | 'yellow'
                  | 'gray'
                  | null
                  | undefined;
                return (
                  <TableRow
                    className={cn(
                      color === 'green' &&
                        'bg-green-200 hover:bg-green-300 dark:bg-green-900/80 dark:hover:bg-green-900/90',
                      color === 'blue' &&
                        'bg-blue-200 hover:bg-blue-300 dark:bg-blue-900/80 dark:hover:bg-blue-900/90',
                      color === 'orange' &&
                        'bg-orange-200 hover:bg-orange-300 dark:bg-orange-900/80 dark:hover:bg-orange-900/90',
                      color === 'yellow' &&
                        'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-900/80 dark:hover:bg-yellow-900/90',
                      color === 'gray' &&
                        'bg-gray-200 hover:bg-gray-300 dark:bg-gray-500/80 dark:hover:bg-gray-500/90',
                    )}
                    data-state={row.getIsSelected() && 'selected'}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        className="overflow-hidden text-ellipsis"
                        key={cell.id}
                        style={{
                          width: `${(cell.column.getSize() / table.getTotalSize()) * 100}%`,
                        }}
                      >
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
