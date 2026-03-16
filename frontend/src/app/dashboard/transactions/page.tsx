"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { transactionColumns } from "@/components/data-table/transaction-columns";
import { getTransactions, getAccounts, type Transaction, type Account } from "@/lib/api";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [accountFilter, setAccountFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchTransactions = useCallback(async () => {
    try {
      const params: {
        limit: number;
        offset: number;
        type?: 'DEPOSIT' | 'TRANSFER';
        accountId?: string;
      } = {
        limit: pageSize,
        offset: page * pageSize,
      };
      if (typeFilter !== "ALL") params.type = typeFilter as 'DEPOSIT' | 'TRANSFER';
      if (accountFilter !== "ALL") params.accountId = accountFilter;

      const res = await getTransactions(params);
      setTransactions(res.data);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, [page, pageSize, typeFilter, accountFilter]);

  useEffect(() => {
    getAccounts().then((res) => setAccounts(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTransactions(), 0);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-montserrat">Transactions</h1>
        <p className="text-muted-foreground mt-1">View all deposits and transfers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 h-9">
        <Select value={typeFilter} onValueChange={(v) => { if (v) { setTypeFilter(v); setPage(0); } }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="DEPOSIT">Deposits</SelectItem>
            <SelectItem value="TRANSFER">Transfers</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accountFilter} onValueChange={(v) => { if (v) { setAccountFilter(v); setPage(0); } }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between font-montserrat">
            <span>All Transactions</span>
            <span className="text-sm font-normal text-muted-foreground">{total} total</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={transactionColumns} 
            data={transactions} 
            pageCount={totalPages}
            state={{
              pagination: {
                pageIndex: page,
                pageSize: pageSize,
              }
            }}
            onPaginationChange={(updater) => {
              if (typeof updater === 'function') {
                const newState = updater({ pageIndex: page, pageSize: pageSize });
                setPage(newState.pageIndex);
                setPageSize(newState.pageSize);
              } else {
                setPage(updater.pageIndex);
                setPageSize(updater.pageSize);
              }
            }}
            getPaginationRowModel
          />
        </CardContent>
      </Card>
    </div>
  );
}
