"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { formatCurrency, formatVnd, formatNumber, formatPercent, formatCrypto, parseVietnameseNumber } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Plus, TrendingUp, TrendingDown, RefreshCw, Info, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {Link} from "@/navigation";
import { AddP2PTransactionDialog } from "@/components/p2p/AddP2PTransactionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function P2PPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedCrypto] = useState("USDT");
  const [selectedFiat] = useState("VND");

  const { data: transactions, refetch: refetchTransactions } = api.p2p.getTransactions.useQuery({
    crypto: selectedCrypto,
    fiatCurrency: selectedFiat,
  });

  const { data: portfolioSummary, refetch: refetchSummary } = api.p2p.getPortfolioSummary.useQuery({
    crypto: selectedCrypto,
    fiatCurrency: selectedFiat,
  });

  const fetchCurrentRate = api.p2p.fetchCurrentRate.useMutation({
    onSuccess: () => {
      refetchSummary();
    },
  });

  const deleteTransaction = api.p2p.deleteTransaction.useMutation({
    onSuccess: () => {
      refetchTransactions();
      refetchSummary();
    },
  });

  // Formatters are imported from utils/formatters.ts

  const formatCurrencyWithSymbol = (amount: number, currency: string) => {
    if (currency === "VND") {
      return formatVnd(amount);
    }
    if (currency === "USD") {
      return formatCurrency(amount);
    }
    return `${formatNumber(amount)} ${currency}`;
  };

  const formatPercentage = (value: number) => {
    const formatted = formatPercent(Math.abs(value), 2);
    if (value > 0) {
      return <span className="text-green-600">+{formatted}</span>;
    } else if (value < 0) {
      return <span className="text-red-600">-{formatted}</span>;
    }
    return <span>{formatted}</span>;
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">P2P Trading</h1>
            <p className="text-muted-foreground">
              Track your P2P USDT purchases and calculate profit/loss
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

      {/* Portfolio Summary */}
      {portfolioSummary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">USDT Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(portfolioSummary.summary.currentHoldings)} USDT
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total bought: {formatNumber(portfolioSummary.summary.totalBought)} USDT
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Buy Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrencyWithSymbol(portfolioSummary.summary.weightedAverageRate, "VND")}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  Current: {formatCurrencyWithSymbol(portfolioSummary.summary.currentMarketRate, "VND")}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => fetchCurrentRate.mutate({ crypto: selectedCrypto, fiatCurrency: selectedFiat })}
                  disabled={fetchCurrentRate.isPending}
                >
                  <RefreshCw className={`h-3 w-3 ${fetchCurrentRate.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Value (VND)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrencyWithSymbol(portfolioSummary.summary.currentValue, "VND")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cost basis: {formatCurrencyWithSymbol(portfolioSummary.summary.costBasis, "VND")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Profit/Loss (If Sold Now)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${portfolioSummary.summary.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioSummary.summary.unrealizedPnL >= 0 ? '+' : ''}{formatCurrencyWithSymbol(portfolioSummary.summary.unrealizedPnL, "VND")}
              </div>
              <p className="text-xs mt-1">
                {formatPercentage(portfolioSummary.summary.unrealizedPnLPercent)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All your P2P transactions for {selectedCrypto}/{selectedFiat}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((tx) => (
                <TableRow key={tx.id} className="group relative">
                  <TableCell>{format(new Date(tx.transactionDate), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <Badge variant={tx.type === "buy" ? "default" : "secondary"}>
                      {tx.type === "buy" ? (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      ) : (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      )}
                      {tx.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(tx.cryptoAmount)} {tx.crypto}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyWithSymbol(tx.exchangeRate, tx.fiatCurrency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyWithSymbol(tx.fiatAmount, tx.fiatCurrency)}
                  </TableCell>
                  <TableCell>{tx.platform || "-"}</TableCell>
                  <TableCell>{tx.counterparty || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(tx.bankName || tx.paymentMethod || tx.notes || tx.transactionId) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem className="cursor-pointer">
                                <Info className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-sm">
                              <div className="space-y-2 text-sm">
                                {tx.bankName && (
                                  <div>
                                    <span className="font-medium">Bank:</span> {tx.bankName}
                                  </div>
                                )}
                                {tx.paymentMethod && (
                                  <div>
                                    <span className="font-medium">Payment:</span> {tx.paymentMethod}
                                  </div>
                                )}
                                {tx.transactionId && (
                                  <div>
                                    <span className="font-medium">Transaction ID:</span>
                                    <div className="text-xs break-all mt-0.5 font-mono">
                                      {tx.transactionId}
                                    </div>
                                  </div>
                                )}
                                {tx.notes && (
                                  <div>
                                    <span className="font-medium">Notes:</span>
                                    <div className="text-xs mt-0.5">{tx.notes}</div>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setEditingTransaction(tx)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this transaction?")) {
                              deleteTransaction.mutate({ id: tx.id });
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        <AddP2PTransactionDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={() => {
            refetchTransactions();
            refetchSummary();
          }}
        />

        <AddP2PTransactionDialog
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          editTransaction={editingTransaction}
          onSuccess={() => {
            refetchTransactions();
            refetchSummary();
            setEditingTransaction(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
