"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  Users,
  ArrowDownLeft,
  ArrowRight,
  ArrowLeftRight,
  Receipt,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getAccounts, getTransactions, type Account, type Transaction } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { DataTable } from "@/components/data-table/data-table";
import { transactionColumns } from "@/components/data-table/transaction-columns";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsRes, transactionsRes] = await Promise.all([
          getAccounts(),
          getTransactions({ limit: 50 }),
        ]);
        setAccounts(accountsRes.data);
        setTransactions(transactionsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalAccounts = accounts.length;
  const totalDeposits = transactions.filter((t) => t.type === "DEPOSIT").length;
  const totalTransfers = transactions.filter((t) => t.type === "TRANSFER").length;

  // Bar chart data: Account balances
  const accountBalanceData = useMemo(() => {
    return accounts.map((account) => ({
      name: account.name.length > 12 ? account.name.substring(0, 12) + "..." : account.name,
      balance: account.balance,
    }));
  }, [accounts]);

  const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
  ];

  // Donut chart data: Balance distribution by account type
  const balanceByTypeData = useMemo(() => {
    const grouped: Record<string, number> = {};
    accounts.forEach((a) => {
      const type = a.type || "SAVINGS";
      grouped[type] = (grouped[type] || 0) + a.balance;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [accounts]);

  const quickActions = [
    { name: "Accounts", href: "/dashboard/accounts", icon: Users, desc: "Manage accounts" },
    { name: "Transfer", href: "/dashboard/transfer", icon: ArrowLeftRight, desc: "Send money" },
    { name: "Transactions", href: "/dashboard/transactions", icon: Receipt, desc: "View history" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Welcome to MiniWallet Transaction Manager</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-linear-to-t from-(--overview-card-gradient-from) to-(--overview-card-gradient-to)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Across {totalAccounts} account{totalAccounts !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-t from-(--overview-card-gradient-from) to-(--overview-card-gradient-to)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">Active wallets</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-t from-(--overview-card-gradient-from) to-(--overview-card-gradient-to)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deposits</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalDeposits}</div>
            <p className="text-xs text-muted-foreground">Total deposits</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-t from-(--overview-card-gradient-from) to-(--overview-card-gradient-to)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transfers</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalTransfers}</div>
            <p className="text-xs text-muted-foreground">Total transfers</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="group bg-linear-to-t from-(--overview-card-gradient-from) to-(--overview-card-gradient-to) cursor-pointer transition-all hover:scale-[1.02]">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <action.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{action.name}</p>
                    <p className="text-sm text-muted-foreground">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bar Chart - Account Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Balances</CardTitle>
            <p className="text-sm text-muted-foreground">Current balance per account</p>
          </CardHeader>
          <CardContent>
            {accountBalanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accountBalanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickFormatter={(value) => `KES ${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`KES ${Number(value).toFixed(2)}`, "Balance"]}
                  />
                  <Bar dataKey="balance" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No account data available. Create some accounts first.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut Chart - Balance by Account Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Balance Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">By account type</p>
          </CardHeader>
          <CardContent>
            {balanceByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={balanceByTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {balanceByTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % 2]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`KES ${Number(value).toLocaleString()}` ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No transaction data yet. Make some deposits and transfers.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No transactions yet. Start by creating an account and making a deposit.
            </p>
          ) : (
            <DataTable columns={transactionColumns} data={transactions.slice(0, 5)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
