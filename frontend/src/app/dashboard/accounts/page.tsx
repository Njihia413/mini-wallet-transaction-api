"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Loader2, PiggyBank, Briefcase, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getAccounts, createAccount, type Account, type ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [accountType, setAccountType] = useState("SAVINGS");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchAccounts() {
    try {
      const res = await getAccounts();
      setAccounts(res.data);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      await createAccount(newName.trim(), accountType);
      toast.success("Account created successfully!");
      setNewName("");
      setAccountType("SAVINGS");
      setDialogOpen(false);
      await fetchAccounts();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const message = apiError?.error?.message || "Failed to create account";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-montserrat">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your wallet accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              New Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-montserrat">Create New Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Account Holder&apos;s Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Alice Wanjiku"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                    <SelectItem value="INVESTMENT">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={creating || !newName.trim()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Account
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No accounts yet. Create your first account to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            
            // Dynamic theme based on type
            let Icon = Wallet;
            let iconBg = "bg-primary/10";
            let iconColor = "text-primary";
            let balanceLabel = "Balance";
            let hoverColor = "group-hover:text-primary";
            let BadgeColor = "bg-primary/10 text-primary";
            
            switch (account.type) {
              case "SAVINGS":
                Icon = PiggyBank;
                iconBg = "bg-emerald-500/10";
                iconColor = "text-emerald-500";
                balanceLabel = "Available Savings";
                hoverColor = "group-hover:text-emerald-500";
                BadgeColor = "bg-emerald-500/10 text-emerald-500";
                break;
              case "BUSINESS":
                Icon = Briefcase;
                iconBg = "bg-blue-500/10";
                iconColor = "text-blue-500";
                balanceLabel = "Working Capital";
                hoverColor = "group-hover:text-blue-500";
                BadgeColor = "bg-blue-500/10 text-blue-500";
                break;
              case "INVESTMENT":
                Icon = TrendingUp;
                iconBg = "bg-purple-500/10";
                iconColor = "text-purple-500";
                balanceLabel = "Portfolio Value";
                hoverColor = "group-hover:text-purple-500";
                BadgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
                break;
            }

            return (
              <Link key={account.id} href={`/dashboard/accounts/${account.id}`}>
                <Card className="hover:border-primary/50 transition-all duration-500 cursor-pointer group h-full flex flex-col bg-linear-to-b from-card to-muted/20 border-border/40 hover:shadow-lg dark:hover:shadow-primary/5 overflow-hidden relative">
                  {/* Subtle decorative gradient blob */}
                  <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 pointer-events-none ${iconBg.replace('/10', '')}`} />
                  
                  <CardContent className="p-6 flex-1 flex flex-col justify-between relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-semibold truncate transition-colors ${hoverColor}`}>
                            {account.name}
                          </p>
                          <Badge variant="secondary" className={`text-[10px] leading-none py-1 border-transparent ${BadgeColor}`}>
                            {account.type || "SAVINGS"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDate(account.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{balanceLabel}</p>
                      <p className="text-2xl font-bold text-foreground font-montserrat">
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
