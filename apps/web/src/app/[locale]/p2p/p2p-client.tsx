"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
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
import { AddP2PTransactionDialog } from "@/components/p2p/AddP2PTransactionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function P2PClient() {
  const t = useTranslations('p2p');
  
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
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addTransaction')}
          </Button>
        </div>

        {/* Portfolio Summary */}
        {portfolioSummary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('portfolioSummary.usdtBalance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatVnd(portfolioSummary.summary.p2pNetFiatInvestment ?? portfolioSummary.summary.netInvested)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(portfolioSummary.summary.p2pNetInvestment ?? (portfolioSummary.summary.totalBought - portfolioSummary.summary.totalSold))} USDT
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('portfolioSummary.averageBuyPrice')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyWithSymbol(portfolioSummary.summary.weightedAverageRate, "VND")}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {t('portfolioSummary.current')}: {formatCurrencyWithSymbol(portfolioSummary.summary.currentMarketRate, "VND")}
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
                <CardTitle className="text-sm font-medium">{t('portfolioSummary.currentValueVnd')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyWithSymbol(portfolioSummary.summary.currentValue, "VND")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('portfolioSummary.costBasis')}: {formatNumber(portfolioSummary.summary.currentHoldings, 2)} USDT
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('portfolioSummary.profitLoss')}</CardTitle>
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
            <CardTitle>{t('transactionHistory.title')}</CardTitle>
            <CardDescription>
              {t('transactionHistory.description', { crypto: selectedCrypto, fiat: selectedFiat })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transactionHistory.date')}</TableHead>
                  <TableHead>{t('transactionHistory.type')}</TableHead>
                  <TableHead className="text-right">{t('transactionHistory.amount')}</TableHead>
                  <TableHead className="text-right">{t('transactionHistory.rate')}</TableHead>
                  <TableHead className="text-right">{t('transactionHistory.total')}</TableHead>
                  <TableHead>{t('transactionHistory.platform')}</TableHead>
                  <TableHead>{t('transactionHistory.counterparty')}</TableHead>
                  <TableHead>{t('details.transactionId')}</TableHead>
                  <TableHead>{t('details.notes')}</TableHead>
                  <TableHead className="w-[50px]">{t('transactionHistory.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((tx) => (
                  <TableRow key={tx.id} className="group relative">
                    <TableCell>{format(new Date(tx.transactionDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "buy" ? "default" : "destructive"}>
                        {tx.type === "buy" ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {tx.type === "buy" ? t('transactionHistory.buy') : t('transactionHistory.sell')}
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
                    <TableCell className="max-w-xs truncate">{tx.transactionId || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{tx.notes || "-"}</TableCell>
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
                                  {t('actions.viewDetails')}
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-sm">
                                <div className="space-y-2 text-sm">
                                  {tx.bankName && (
                                    <div>
                                      <span className="font-medium">{t('details.bank')}:</span> {tx.bankName}
                                    </div>
                                  )}
                                  {tx.paymentMethod && (
                                    <div>
                                      <span className="font-medium">{t('details.payment')}:</span> {tx.paymentMethod}
                                    </div>
                                  )}
                                  {tx.transactionId && (
                                    <div>
                                      <span className="font-medium">{t('details.transactionId')}:</span>
                                      <div className="text-xs break-all mt-0.5 font-mono">
                                        {tx.transactionId}
                                      </div>
                                    </div>
                                  )}
                                  {tx.notes && (
                                    <div>
                                      <span className="font-medium">{t('details.notes')}:</span>
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
                            {t('actions.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => {
                              if (confirm(t('actions.confirmDelete'))) {
                                deleteTransaction.mutate({ id: tx.id });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('actions.delete')}
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