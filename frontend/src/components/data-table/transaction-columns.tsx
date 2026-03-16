"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { type Transaction } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"

interface TransactionTableMeta {
  currentAccountId?: string;
}

export const transactionColumns: ColumnDef<Transaction, unknown>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row, table }) => {
      const type = row.getValue("type") as string;
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const currentAccountId = meta?.currentAccountId;
      
      const txn = row.original;
      
      let isIncoming = type === "DEPOSIT";
      
      if (type === "TRANSFER") {
        if (currentAccountId === txn.toAccountId) {
          isIncoming = true;
        } else if (currentAccountId === txn.fromAccountId) {
          isIncoming = false;
        } else {
          // Fallback if not viewed within a specific account context
          isIncoming = false;
        }
      }
      
      return (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isIncoming ? "bg-primary/10" : "bg-red-500/10"
            }`}
          >
            {isIncoming ? (
              <ArrowDownLeft className="w-4 h-4 text-primary" />
            ) : (
              <ArrowUpRight className="w-4 h-4 text-red-500" />
            )}
          </div>
          <Badge
            variant="secondary"
            className={`text-[10px] ${
              isIncoming
                ? "bg-primary/10 text-primary"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {type}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      return <span className="font-medium">{row.getValue("description")}</span>;
    }
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => {
      const txn = row.original;
      return (
        <span className="text-sm text-muted-foreground">
          {txn.type === "TRANSFER" && (
            <span>
              {txn.fromAccountName || "Unknown"} → {txn.toAccountName || "Unknown"}
            </span>
          )}
          {txn.type === "DEPOSIT" && txn.toAccountName && (
            <span>To {txn.toAccountName}</span>
          )}
        </span>
      );
    }
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.getValue("createdAt"))}
        </span>
      );
    }
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row, table }) => {
      const type = row.getValue("type") as string;
      const amount = row.getValue("amount") as number;
      const meta = table.options.meta as TransactionTableMeta | undefined;
      const currentAccountId = meta?.currentAccountId;
      
      const txn = row.original;
      
      let isIncoming = type === "DEPOSIT";
      
      if (type === "TRANSFER") {
        if (currentAccountId === txn.toAccountId) {
          isIncoming = true;
        } else if (currentAccountId === txn.fromAccountId) {
          isIncoming = false;
        } else {
          // Fallback if not viewed within a specific account context
          isIncoming = false;
        }
      }
      
      return (
        <div className="text-right font-semibold">
          <span className={isIncoming ? "text-primary" : "text-red-500"}>
            {isIncoming ? "+" : "-"}{formatCurrency(amount)}
          </span>
        </div>
      );
    },
  },
]
