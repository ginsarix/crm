'use client';

import {
  type ColumnDef,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
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
  Download,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import XLSX from 'xlsx-js-style';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
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
  totalCount?: number;
  tableId?: string;
  defaultColumnVisibility?: VisibilityState;
  exportFilename?: string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  bulkActionsBar?: ReactNode;
  getRowId?: (row: TData) => string;
  /** Rows for which this returns true render with a neutral "restricted" style instead of their color-coding. */
  getRowRestricted?: (row: TData) => boolean;
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

// oklch tokens from globals.css converted to hex for Excel compatibility
const EXCEL_COLORS = {
  primary: 'C07B2E', // oklch(0.65 0.14 72)  — warm amber
  primaryFg: 'FFFFFF', // oklch(1 0 0)
  fg: '1B1D27', // oklch(0.15 0.014 245) — near-black blue-gray
  border: 'DFE1EA', // oklch(0.88 0.007 245) — light border
  card: 'FFFFFF', // oklch(1 0 0)
  muted: 'ECEEF4', // oklch(0.93 0.007 245) — alternating row
} as const;

// mirrors the Tailwind bg-*-200 classes used for colored rows in the UI
const EXCEL_ROW_COLORS: Record<string, string> = {
  green: 'BBF7D0', // green-200
  blue: 'BFDBFE', // blue-200
  orange: 'FED7AA', // orange-200
  yellow: 'FEF08A', // yellow-200
  gray: 'E5E7EB', // gray-200
  purple: 'E9D5FF', // purple-200
};

function makeBorder(color: string) {
  const side = { style: 'thin', color: { rgb: color } };
  return { top: side, bottom: side, left: side, right: side };
}

function cellValue(value: unknown): {
  v: string | number | boolean;
  t: 's' | 'n' | 'b';
} {
  if (value === null || value === undefined) return { v: '', t: 's' };
  if (value instanceof Date)
    return { v: value.toLocaleDateString('tr-TR'), t: 's' };
  if (typeof value === 'number') return { v: value, t: 'n' };
  if (typeof value === 'boolean') return { v: value, t: 'b' };
  return { v: String(value), t: 's' };
}

function exportToExcel<TData>(
  table: ReturnType<typeof useReactTable<TData>>,
  filename: string,
) {
  const visibleColumns = table
    .getVisibleLeafColumns()
    .filter((col) => typeof col.accessorFn !== 'undefined');

  const rows = table.getRowModel().rows;
  const ws: Record<string, unknown> = {};
  const border = makeBorder(EXCEL_COLORS.border);

  // Header row
  visibleColumns.forEach((col, c) => {
    const h = col.columnDef.header;
    const label =
      typeof h === 'string'
        ? h
        : col.id.charAt(0).toUpperCase() + col.id.slice(1);
    ws[XLSX.utils.encode_cell({ r: 0, c })] = {
      v: label,
      t: 's',
      s: {
        fill: { patternType: 'solid', fgColor: { rgb: EXCEL_COLORS.primary } },
        font: {
          bold: true,
          color: { rgb: EXCEL_COLORS.primaryFg },
          sz: 11,
          name: 'Calibri',
        },
        border,
        alignment: { horizontal: 'left', vertical: 'center' },
      },
    };
  });

  // Data rows — use row color if present, otherwise alternate card/muted
  rows.forEach((row, r) => {
    const rowColor = (row.original as Record<string, unknown>).color as
      | string
      | null
      | undefined;
    const bg =
      (rowColor && EXCEL_ROW_COLORS[rowColor]) ??
      (r % 2 === 1 ? EXCEL_COLORS.muted : EXCEL_COLORS.card);
    visibleColumns.forEach((col, c) => {
      const { v, t } = cellValue(row.getValue(col.id));
      ws[XLSX.utils.encode_cell({ r: r + 1, c })] = {
        v,
        t,
        s: {
          fill: { patternType: 'solid', fgColor: { rgb: bg } },
          font: { color: { rgb: EXCEL_COLORS.fg }, sz: 11, name: 'Calibri' },
          border,
          alignment: { horizontal: 'left', vertical: 'center' },
        },
      };
    });
  });

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: visibleColumns.length - 1 },
  });
  ws['!cols'] = visibleColumns.map((col) => {
    const h = col.columnDef.header;
    const headerLabel =
      typeof h === 'string'
        ? h
        : col.id.charAt(0).toUpperCase() + col.id.slice(1);
    const maxLen = rows.reduce((max, row) => {
      const { v } = cellValue(row.getValue(col.id));
      return Math.max(max, String(v).length);
    }, headerLabel.length);
    return { wch: Math.min(maxLen + 3, 60) };
  });
  ws['!rows'] = [{ hpx: 22 }, ...rows.map(() => ({ hpx: 20 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sayfa1');
  XLSX.writeFile(wb, `nesbir_crm_${filename}.xlsx`);
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
  totalCount,
  tableId = 'default',
  defaultColumnVisibility = {},
  exportFilename,
  rowSelection,
  onRowSelectionChange,
  bulkActionsBar,
  getRowId,
  getRowRestricted,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => loadColumnVisibility(tableId, defaultColumnVisibility),
  );

  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadColumnSizing(tableId),
  );

  const skipVisibilitySave = useRef(true);
  useEffect(() => {
    if (skipVisibilitySave.current) {
      skipVisibilitySave.current = false;
      return;
    }
    saveColumnVisibility(tableId, columnVisibility);
  }, [tableId, columnVisibility]);

  useEffect(() => {
    saveColumnSizing(tableId, columnSizing);
  }, [tableId, columnSizing]);

  const internalColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (rowSelection === undefined) return columns;
    const selectCol = {
      id: 'select',
      size: 40,
      enableResizing: false,
      enableSorting: false,
      header: ({
        table: t,
      }: {
        table: ReturnType<typeof useReactTable<TData>>;
      }) => (
        <Checkbox
          aria-label="Tümünü seç"
          checked={
            t.getIsAllPageRowsSelected()
              ? true
              : t.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(v) => t.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({
        row,
      }: {
        row: {
          getIsSelected: () => boolean;
          toggleSelected: (v: boolean) => void;
        };
      }) => (
        <Checkbox
          aria-label="Satırı seç"
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    } as ColumnDef<TData, TValue>;
    return [selectCol, ...columns];
  }, [columns, rowSelection]);

  const table = useReactTable({
    data,
    columns: internalColumns,
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
    ...(rowSelection !== undefined && {
      enableRowSelection: true,
      onRowSelectionChange,
      getRowId:
        getRowId ??
        ((row: TData) => (row as Record<string, unknown>).id as string),
    }),
    state: {
      sorting,
      pagination,
      columnVisibility,
      columnSizing,
      ...(rowSelection !== undefined && { rowSelection }),
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
      <div className="flex justify-end gap-2 border-x border-t bg-card px-4 py-2">
        {exportFilename && (
          <Button
            className="gap-2"
            onClick={() => exportToExcel(table, exportFilename)}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
        )}
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

      {/* Bulk Actions Bar */}
      {bulkActionsBar}

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
                  | 'purple'
                  | null
                  | undefined;
                const restricted = getRowRestricted?.(row.original) ?? false;
                return (
                  <TableRow
                    className={cn(
                      restricted
                        ? 'bg-muted/70 text-muted-foreground opacity-70 hover:bg-muted/90 dark:bg-muted/40 dark:hover:bg-muted/60'
                        : cn(
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
                            color === 'purple' &&
                              'bg-purple-200 hover:bg-purple-300 dark:bg-purple-900/80 dark:hover:bg-purple-900/90',
                          ),
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
          <div className="flex items-center gap-2">
            {totalCount !== undefined && (
              <span className="text-muted-foreground text-sm">
                Toplam Satır Sayısı: {totalCount}
              </span>
            )}
            <span className="text-muted-foreground text-sm">
              Sayfa Başı Satır Sayısı
            </span>
            <Select
              onValueChange={(value) => {
                setPagination?.({ pageIndex: 0, pageSize: Number(value) });
              }}
              value={String(pagination.pageSize)}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
                <SelectItem value="0">Tümü</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">
              Sayfa {pagination.pageIndex + 1}
              {pageCount > 0 && ` / ${pageCount}`}
            </span>
          </div>
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
