"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Wallet,
  PiggyBank,
  Briefcase,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { transactionColumns } from "@/components/data-table/transaction-columns";
import {
  getAccount,
  getTransactions,
  deposit,
  type Account,
  type Transaction,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [depositing, setDepositing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [accountRes, txnRes] = await Promise.all([
        getAccount(accountId),
        getTransactions({ accountId, limit: 100 }), // Increased limit for better stats
      ]);
      setAccount(accountRes.data);
      setTransactions(txnRes.data);
    } catch (err: unknown) {
      const error = err as { error?: { code?: string } };
      if (error?.error?.code === "NOT_FOUND" || error?.error?.code === "INVALID_ID") {
        toast.error("Account not found");
        router.push("/dashboard/accounts");
        return;
      }
      toast.error("Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [accountId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      toast.error("Please enter a valid amount of at least Ksh 1");
      return;
    }

    setDepositing(true);
    try {
      await deposit(accountId, numAmount, description || undefined);
      toast.success(`Successfully deposited ${formatCurrency(numAmount)}`);
      setAmount("");
      setDescription("");
      await fetchData();
    } catch (err: unknown) {
      const error = err as { error?: { message?: string } };
      toast.error(error?.error?.message || "Deposit failed");
    } finally {
      setDepositing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) return null;

  // Dynamic Theme & Metrics Context
  let Icon = Wallet;
  let iconBg = "bg-emerald-500/10";
  let iconColor = "text-emerald-500";
  let balanceLabel = "Current Balance";
  let BadgeColor = "bg-emerald-500/10 text-emerald-500 border-transparent";

  let primaryStatLabel = "Total Transactions";
  let primaryStatValue = transactions.length.toString();
  let secondaryStatLabel = "Latest Activity";
  let secondaryStatValue = transactions.length > 0 ? formatDate(transactions[0].createdAt) : "None";

  switch (account.type) {
    case "SAVINGS": {
      Icon = PiggyBank;
      iconBg = "bg-emerald-500/10";
      iconColor = "text-emerald-500";
      balanceLabel = "Total Savings";
      BadgeColor = "bg-emerald-500/10 text-emerald-500 border-transparent";
      
      const totalDeposited = transactions
        .filter(t => t.type === "DEPOSIT" || (t.type === "TRANSFER" && t.toAccountId === account.id))
        .reduce((sum, t) => sum + t.amount, 0);
      
      primaryStatLabel = "Recent Inflows";
      primaryStatValue = formatCurrency(totalDeposited);
      break;
    }
    case "BUSINESS": {
      Icon = Briefcase;
      iconBg = "bg-blue-500/10";
      iconColor = "text-blue-500";
      balanceLabel = "Working Capital";
      BadgeColor = "bg-blue-500/10 text-blue-500 border-transparent";
      
      const moneyIn = transactions
        .filter(t => t.type === "DEPOSIT" || (t.type === "TRANSFER" && t.toAccountId === account.id))
        .reduce((sum, t) => sum + t.amount, 0);
      const moneyOut = transactions
        .filter(t => t.type === "TRANSFER" && t.fromAccountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);
        
      primaryStatLabel = "Period Cash Flow (In)";
      primaryStatValue = formatCurrency(moneyIn);
      secondaryStatLabel = "Period Cash Flow (Out)";
      secondaryStatValue = formatCurrency(moneyOut);
      break;
    }
    case "INVESTMENT": {
      Icon = TrendingUp;
      iconBg = "bg-purple-500/10";
      iconColor = "text-purple-500";
      balanceLabel = "Portfolio Value";
      BadgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-transparent";
      
      const netContributions = transactions.reduce((sum, t) => {
        if (t.type === "DEPOSIT" || (t.type === "TRANSFER" && t.toAccountId === account.id)) return sum + t.amount;
        if (t.type === "TRANSFER" && t.fromAccountId === account.id) return sum - t.amount;
        return sum;
      }, 0);
      
      primaryStatLabel = "Net Contributions";
      primaryStatValue = formatCurrency(netContributions);
      break;
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/accounts")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight font-montserrat">{account.name}</h1>
            <Badge variant="secondary" className={`text-xs ${BadgeColor}`}>{account.type || "SAVINGS"}</Badge>
          </div>
        </div>
      </div>

      {/* Balance + Deposit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="lg:col-span-1 h-full">
          <Card className="border-primary/20 bg-linear-to-br from-primary/10 to-primary/5 h-full">
            <CardContent className="p-8 flex flex-col justify-center h-full">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-7 h-7 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{balanceLabel}</p>
                  <p className="text-3xl font-bold text-foreground mt-1 font-montserrat break-all">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Details / Stats Card */}
        <div className="lg:col-span-1 h-full">
          <Card className="h-full flex flex-col justify-center">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-sm">{primaryStatLabel}</p>
                  <p className={`text-xl font-semibold font-montserrat mt-1 ${account.type === 'BUSINESS' ? 'text-blue-500' : 'text-emerald-500'}`}>{primaryStatValue}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{secondaryStatLabel}</p>
                  <p className={`text-lg font-medium mt-1 ${account.type === 'BUSINESS' ? 'text-red-500' : 'text-foreground'}`}>{secondaryStatValue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deposit Form */}
        <div className="lg:col-span-1 h-full">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-montserrat">Quick Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs">Description (optional)</Label>
                <Input
                  id="desc"
                  placeholder="e.g. Salary payment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={depositing || !amount}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {depositing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Deposit
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-montserrat">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={transactionColumns} 
            data={transactions}
            meta={{
              currentAccountId: accountId
            }}
            getPaginationRowModel
          />
        </CardContent>
      </Card>
    </div>
  );
}
