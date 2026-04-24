"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AuditLog, User } from "generated/prisma";
import { AlertCircle, CheckCircle2, Eye, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  auditAction,
  resourceType as resourceTypeLabels,
} from "~/lib/enum-map";

type AuditLogWithUser = AuditLog & {
  user: Pick<User, "id" | "name" | "email" | "image"> | null;
};

export const createColumns = (
  onViewAuditLog: (auditLog: AuditLogWithUser) => void,
): ColumnDef<AuditLogWithUser>[] => [
  {
    id: "actions",
    cell: ({ row }) => {
      const auditLog = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 w-8 p-0" variant="ghost">
              <span className="sr-only">Menüyü aç</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Eylemler
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewAuditLog(auditLog)}>
              <Eye className="mr-2 h-4 w-4" />
              Detayları Görüntüle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Tarih",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return (
        <div className="flex flex-col">
          <span className="text-sm">
            {new Date(date).toLocaleDateString("tr-TR")}
          </span>
          <span className="text-muted-foreground text-xs">
            {new Date(date).toLocaleTimeString("tr-TR")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "user",
    header: "Kullanıcı",
    enableSorting: false,
    cell: ({ row }) => {
      const user = row.original.user;

      if (!user) {
        return (
          <span className="text-muted-foreground text-sm italic">Sistem</span>
        );
      }

      const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage alt={user.name} src={user.image ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{user.name}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "action",
    header: "İşlem",
    enableSorting: true,
    cell: ({ row }) => {
      const action = row.getValue("action") as keyof typeof auditAction;
      return (
        <Badge className="font-normal" variant="outline">
          {auditAction[action] ?? action}
        </Badge>
      );
    },
  },
  {
    accessorKey: "resourceType",
    header: "Kaynak Türü",
    enableSorting: true,
    cell: ({ row }) => {
      const rt = row.getValue(
        "resourceType",
      ) as keyof typeof resourceTypeLabels;
      return <span className="text-sm">{resourceTypeLabels[rt] ?? rt}</span>;
    },
  },
  {
    accessorKey: "resourceId",
    header: "Kaynak ID",
    enableSorting: false,
    cell: ({ row }) => {
      const resourceId = row.getValue("resourceId") as string | null;
      if (!resourceId) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help font-mono text-xs">
                {resourceId.slice(0, 8)}...
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">{resourceId}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "result",
    header: "Sonuç",
    enableSorting: true,
    cell: ({ row }) => {
      const result = row.getValue("result") as string;
      return result === "SUCCESS" ? (
        <div className="flex items-center gap-1 text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">Başarılı</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Başarısız</span>
        </div>
      );
    },
  },
  {
    accessorKey: "details",
    header: "Detaylar",
    enableSorting: false,
    cell: ({ row }) => {
      const details = row.getValue("details") as string | null;
      if (!details) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-[200px] cursor-help truncate text-sm">
                {details.slice(0, 50)}
                {details.length > 50 ? "..." : ""}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[400px]">
              <p className="whitespace-pre-wrap text-xs">{details}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];
