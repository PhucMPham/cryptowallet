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

  // Debug logging for portfolio calculations
  useEffect(() => {
    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_P2P === '1' || process.env.NODE_ENV !== 'production';
    if (!DEBUG || !portfolioSummary?.summary) return;

    const summary = portfolioSummary.summary;
    const fmt2 = (n: number | null | undefined) =>
      Number(n ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    console.group(`[P2P][Client] Dashboard Calculations - ${summary.crypto}/${summary.fiatCurrency}`);
    console.log('Received summary from server:', summary);
    console.log('──────────────────────────────');

    // 1) USDT Investment (Total Bought)
    const usdtInvestment = summary.totalBought;
    console.log(`1️⃣ Tổng Đầu Tư USDT (Total Investment) = totalBought = ${fmt2(usdtInvestment)} USDT`);
    console.log(`   Current Holdings: ${fmt2(summary.currentHoldings)} USDT (after ${fmt2(summary.totalSold)} USDT sold)`);
    console.log(`   Formula: currentHoldings = totalBought - totalSold = ${fmt2(summary.totalBought)} - ${fmt2(summary.totalSold)} = ${fmt2(summary.totalBought - summary.totalSold)}`);

    // 2) Average Buy Price
    const avgBuyPrice = summary.weightedAverageRate;
    if (summary.totalBought === 0) {
      console.warn('⚠️ [2] Giá Mua Trung Bình: no buy transactions -> defaulting to 0.00');
    }
    console.log(`2️⃣ Giá Mua Trung Bình = weightedAverageRate = ${fmt2(avgBuyPrice)} VND/USDT`);
    console.log(`   Formula check: totalFiatSpent / totalBought = ${fmt2(summary.totalFiatSpent)} / ${fmt2(summary.totalBought)} = ${fmt2(summary.totalBought > 0 ? summary.totalFiatSpent / summary.totalBought : 0)}`);

    // 3) Current Value (VND)
    const currentValue = summary.currentValue;
    console.log(`3️⃣ Giá Trị Hiện Tại (VNĐ) = ${formatVnd(currentValue)}`);
    console.log(`   Formula check: currentHoldings * currentMarketRate = ${fmt2(summary.currentHoldings)} * ${fmt2(summary.currentMarketRate)} = ${formatVnd(summary.currentHoldings * summary.currentMarketRate)}`);

    // 4) P/L if sold now
    const pnlIfSellNow = summary.unrealizedPnL;
    const pnlPercent = summary.unrealizedPnLPercent;
    console.log(`4️⃣ Lãi/Lỗ (Nếu Bán Ngay) = ${pnlIfSellNow >= 0 ? '+' : ''}${formatVnd(pnlIfSellNow)} (${pnlPercent >= 0 ? '+' : ''}${fmt2(pnlPercent)}%)`);
    console.log(`   Formula check: currentValue - costBasis = ${formatVnd(currentValue)} - ${formatVnd(summary.costBasis)} = ${formatVnd(currentValue - summary.costBasis)}`);

    // Data validation checks
    console.log('──────────────────────────────');
    console.log('🔍 Validation checks:');

    const computedHoldings = summary.totalBought - summary.totalSold;
    if (Math.abs(computedHoldings - summary.currentHoldings) > 0.0001) {
      console.warn(`⚠️ Holdings mismatch: computed ${fmt2(computedHoldings)} != server ${fmt2(summary.currentHoldings)}`);
    } else {
      console.log('✅ Holdings calculation verified');
    }

    const computedAvgPrice = summary.totalBought > 0 ? summary.totalFiatSpent / summary.totalBought : 0;
    if (Math.abs(computedAvgPrice - summary.weightedAverageRate) > 0.01) {
      console.warn(`⚠️ Avg price mismatch: computed ${fmt2(computedAvgPrice)} != server ${fmt2(summary.weightedAverageRate)}`);
    } else {
      console.log('✅ Average price calculation verified');
    }

    const computedValue = summary.currentHoldings * summary.currentMarketRate;
    if (Math.abs(computedValue - summary.currentValue) > 0.01) {
      console.warn(`⚠️ Current value mismatch: computed ${fmt2(computedValue)} != server ${fmt2(summary.currentValue)}`);
    } else {
      console.log('✅ Current value calculation verified');
    }

    const computedPnL = summary.currentValue - summary.costBasis;
    if (Math.abs(computedPnL - summary.unrealizedPnL) > 0.01) {
      console.warn(`⚠️ PnL mismatch: computed ${fmt2(computedPnL)} != server ${fmt2(summary.unrealizedPnL)}`);
    } else {
      console.log('✅ P/L calculation verified');
    }

    // Edge case warnings
    if (summary.currentMarketRate === 0) {
      console.warn('⚠️ No market rate -> current value and PnL may be inaccurate');
    }
    if (summary.currentHoldings < 0) {
      console.warn(`⚠️ Negative holdings (${fmt2(summary.currentHoldings)}) detected`);
    }
    if (summary.totalBought === 0 && summary.totalSold > 0) {
      console.warn('⚠️ Sold USDT without any buy records');
    }

    console.groupEnd();
  }, [portfolioSummary]);

  // Enhanced debug logging for individual transactions
  useEffect(() => {
    const DEBUG = process.env.NEXT_PUBLIC_DEBUG_P2P === '1' || process.env.NODE_ENV !== 'production';
    if (!DEBUG || !transactions || !portfolioSummary?.summary) return;

    const fmt2 = (n: number | null | undefined) =>
      Number(n ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    console.group(`[P2P][Client] Transaction Analysis - ${transactions.length} transactions`);

    // Create a table view of all transactions
    const transactionTable: any[] = [];
    let runningBought = 0;
    let runningS = 0;
    let runningHoldings = 0;
    let runningFiatSpent = 0;
    let runningFiatReceived = 0;

    // Sort transactions by date to show chronological order
    const sortedTx = [...transactions].sort((a, b) =>
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    console.log('📊 Transaction Timeline (chronological order):');
    console.log('──────────────────────────────');

    sortedTx.forEach((tx, index) => {
      const isBuy = tx.type === 'buy';

      // Update running totals
      if (isBuy) {
        runningBought += tx.cryptoAmount;
        runningFiatSpent += tx.fiatAmount + (tx.feeAmount || 0);
      } else {
        runningS += tx.cryptoAmount;
        runningFiatReceived += tx.fiatAmount - (tx.feeAmount || 0);
      }
      runningHoldings = runningBought - runningS;

      const txInfo = {
        '#': index + 1,
        'Date': format(new Date(tx.transactionDate), 'dd/MM HH:mm'),
        'Type': tx.type.toUpperCase(),
        'Amount': `${fmt2(tx.cryptoAmount)} USDT`,
        'Rate': fmt2(tx.exchangeRate),
        'Value': fmt2(tx.fiatAmount),
        'Fee': tx.feeAmount ? fmt2(tx.feeAmount) : '-',
        'Platform': tx.platform || '-',
        '💰 Total Bought': fmt2(runningBought),
        '💸 Total Sold': fmt2(runningS),
        '📊 Holdings': fmt2(runningHoldings)
      };

      transactionTable.push(txInfo);

      // Log individual transaction details
      console.log(`[${index + 1}/${sortedTx.length}] ${isBuy ? '🟢 BUY' : '🔴 SELL'} ${format(new Date(tx.transactionDate), 'dd/MM/yyyy HH:mm')}`);
      console.log(`   Amount: ${fmt2(tx.cryptoAmount)} USDT @ ${fmt2(tx.exchangeRate)} VND/USDT = ${fmt2(tx.fiatAmount)} VND`);
      if (tx.feeAmount) {
        console.log(`   Fee: ${fmt2(tx.feeAmount)} VND`);
      }
      console.log(`   Platform: ${tx.platform || 'N/A'}, Counterparty: ${tx.counterparty || 'N/A'}`);
      console.log(`   Running totals after this tx:`);
      console.log(`     • Total Bought: ${fmt2(runningBought)} USDT`);
      console.log(`     • Total Sold: ${fmt2(runningS)} USDT`);
      console.log(`     • Current Holdings: ${fmt2(runningHoldings)} USDT`);
      console.log('');
    });

    // Display summary table
    console.log('📋 Transaction Summary Table:');
    console.table(transactionTable);

    // Final verification
    console.log('──────────────────────────────');
    console.log('🔍 Final Verification:');
    console.log(`Client-side calculations:`);
    console.log(`  • Total Bought: ${fmt2(runningBought)} USDT`);
    console.log(`  • Total Sold: ${fmt2(runningS)} USDT`);
    console.log(`  • Holdings: ${fmt2(runningHoldings)} USDT`);
    console.log(`Server-side values:`);
    console.log(`  • Total Bought: ${fmt2(portfolioSummary.summary.totalBought)} USDT`);
    console.log(`  • Total Sold: ${fmt2(portfolioSummary.summary.totalSold)} USDT`);
    console.log(`  • Holdings: ${fmt2(portfolioSummary.summary.currentHoldings)} USDT`);

    // Check for discrepancies
    const boughtDiff = Math.abs(runningBought - portfolioSummary.summary.totalBought);
    const soldDiff = Math.abs(runningS - portfolioSummary.summary.totalSold);
    const holdingsDiff = Math.abs(runningHoldings - portfolioSummary.summary.currentHoldings);

    if (boughtDiff > 0.01 || soldDiff > 0.01 || holdingsDiff > 0.01) {
      console.error('❌ DISCREPANCY DETECTED between client and server calculations!');
      if (boughtDiff > 0.01) console.error(`   Total Bought differs by ${fmt2(boughtDiff)} USDT`);
      if (soldDiff > 0.01) console.error(`   Total Sold differs by ${fmt2(soldDiff)} USDT`);
      if (holdingsDiff > 0.01) console.error(`   Holdings differ by ${fmt2(holdingsDiff)} USDT`);
    } else {
      console.log('✅ Client and server calculations match!');
    }

    // Transaction type breakdown
    const buyTransactions = transactions.filter(tx => tx.type === 'buy');
    const sellTransactions = transactions.filter(tx => tx.type === 'sell');

    console.log('');
    console.log('📊 Transaction Breakdown:');
    console.log(`  • Buy transactions: ${buyTransactions.length}`);
    console.log(`  • Sell transactions: ${sellTransactions.length}`);

    if (sellTransactions.length === 0) {
      console.warn('⚠️ NO SELL TRANSACTIONS FOUND - This explains why totalSold = 0.00');
      console.log('💡 To test sell functionality, add a SELL transaction through the UI');
    }

    console.groupEnd();
  }, [transactions, portfolioSummary]);

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
                  {formatNumber(portfolioSummary.summary.totalBought)} USDT
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('portfolioSummary.currentHoldings')}: {formatNumber(portfolioSummary.summary.currentHoldings)} USDT
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
                  {t('portfolioSummary.costBasis')}: {formatCurrencyWithSymbol(portfolioSummary.summary.costBasis, "VND")}
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
                  <TableHead className="w-[50px]">{t('transactionHistory.actions')}</TableHead>
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