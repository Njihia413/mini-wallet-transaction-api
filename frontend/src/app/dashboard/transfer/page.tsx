"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAccounts, transfer, type Account } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function TransferPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAccounts()
      .then((res) => setAccounts(res.data))
      .catch(() => toast.error("Failed to load accounts"))
      .finally(() => setLoading(false));
  }, []);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();

    if (!fromId || !toId) {
      toast.error("Please select both sender and receiver accounts");
      return;
    }
    if (fromId === toId) {
      toast.error("Cannot transfer to the same account");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      toast.error("Please enter a valid amount of at least Ksh 1");
      return;
    }

    setSubmitting(true);
    try {
      await transfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: numAmount,
        description: description || undefined,
      });
      toast.success(`Successfully transferred ${formatCurrency(numAmount)}`);
      setFromId("");
      setToId("");
      setAmount("");
      setDescription("");
      router.push("/dashboard/transactions");
    } catch (err: unknown) {
      const error = err as { error?: { message?: string } };
      toast.error(error?.error?.message || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  }

  const senderAccount = accounts.find((a) => a.id === fromId);

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-montserrat">Transfer Funds</h1>
        <p className="text-muted-foreground mt-1">Send money between accounts</p>
      </div>

      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <ArrowLeftRight className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-montserrat">New Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length < 2 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  You need at least 2 accounts to make a transfer.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/dashboard/accounts")}
                >
                  Create Accounts
                </Button>
              </div>
            ) : (
              <form onSubmit={handleTransfer} className="space-y-5 mt-2" noValidate>
                {/* From Account */}
                <div className="space-y-2">
                  <Label className="text-xs">From Account</Label>
                  <Select value={fromId} onValueChange={(v) => { if (v) setFromId(v); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select sender account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center justify-between gap-4 w-full">
                            <span>{a.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {formatCurrency(a.balance)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {senderAccount && (
                    <p className="text-xs text-muted-foreground">
                      Available: <span className="text-primary font-medium">{formatCurrency(senderAccount.balance)}</span>
                    </p>
                  )}
                </div>

                {/* To Account */}
                <div className="space-y-2">
                  <Label className="text-xs">To Account</Label>
                  <Select value={toId} onValueChange={(v) => { if (v) setToId(v); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select receiver account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== fromId)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="flex items-center justify-between gap-4 w-full">
                              <span>{a.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {formatCurrency(a.balance)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-xs">Amount (KES)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg font-semibold h-12"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    placeholder="e.g. Rent payment"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={submitting || !fromId || !toId || !amount}
                  className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="w-5 h-5 mr-2" />
                  )}
                  Transfer Funds
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
