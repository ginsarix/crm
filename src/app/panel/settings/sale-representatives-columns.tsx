import type { ColumnDef } from "@tanstack/react-table";
import type { SalesRepresentative } from "generated/prisma";
import { MoreHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export const createColumns = (
  onViewSalesRepresentative: (salesRepresentative: SalesRepresentative) => void,
): ColumnDef<SalesRepresentative>[] => [
  {
    id: "actions",
    cell: ({ row }) => {
      const salesRepresentative = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8 p-0" variant="ghost">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Eylemler
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onViewSalesRepresentative(salesRepresentative)}
            >
              Görüntüle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Ad",
    enableSorting: true,
  },
  {
    accessorKey: "createdAt",
    header: "Oluşturulma Tarihi",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return new Date(date).toLocaleDateString("tr-TR");
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Güncellenme Tarihi",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as Date;
      return new Date(date).toLocaleDateString("tr-TR");
    },
  },
];
