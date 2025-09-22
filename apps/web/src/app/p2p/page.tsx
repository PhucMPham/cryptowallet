"use client";

import { useState } from "react";
import { api } from "@/utils/api";
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
import { format } from "date-fns";
import { Plus, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { AddP2PTransactionDialog } from "@/components/p2p/AddP2PTransactionDialog";

export default function P2PPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "VND") {
      return `${formatNumber(amount)} ₫`;
    }
    return `${formatNumber(amount)} ${currency}`;
  };

  const formatPercentage = (value: number) => {
    const formatted = value.toFixed(2);
    if (value > 0) {
      return <span className="text-green-600">+{formatted}%</span>;
    } else if (value < 0) {
      return <span className="text-red-600">{formatted}%</span>;
    }
    return <span>{formatted}%</span>;
  };

  return (
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
                {formatCurrency(portfolioSummary.summary.weightedAverageRate, "VND")}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  Current: {formatCurrency(portfolioSummary.summary.currentMarketRate, "VND")}
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
                {formatCurrency(portfolioSummary.summary.currentValue, "VND")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cost basis: {formatCurrency(portfolioSummary.summary.costBasis, "VND")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Profit/Loss (If Sold Now)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${portfolioSummary.summary.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioSummary.summary.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.summary.unrealizedPnL, "VND")}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((tx) => (
                <TableRow key={tx.id}>
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
                    {formatCurrency(tx.exchangeRate, tx.fiatCurrency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tx.fiatAmount, tx.fiatCurrency)}
                  </TableCell>
                  <TableCell>{tx.platform || "-"}</TableCell>
                  <TableCell>{tx.counterparty || "-"}</TableCell>
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
    </div>
  );
}