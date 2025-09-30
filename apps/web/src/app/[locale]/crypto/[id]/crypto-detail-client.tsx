"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { api } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatVnd, formatNumber, formatPercent, formatCrypto } from "@/utils/formatters";
import { format } from "date-fns";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity, Calendar, Hash, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { LazyImage } from "@/components/lazy-image";
import { EditCryptoTransactionDialog } from "@/components/crypto/EditCryptoTransactionDialog";

interface CryptoDetailClientProps {
  assetId: number;
}

export default function CryptoDetailClient({ assetId }: CryptoDetailClientProps) {
  const t = useTranslations('cryptoDetail');
  const router = useRouter();
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Fetch asset details
  const { data: asset, isLoading: assetLoading } = api.crypto.getAssetById.useQuery(
    { id: assetId },
    { enabled: !!assetId }
  );

  // Fetch transactions for this asset
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = api.crypto.getTransactionsByAssetId.useQuery(
    { assetId },
    { enabled: !!assetId }
  );

  const handleBack = () => {
    router.push('/crypto');
  };

  if (assetLoading || transactionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('assetNotFound')}</p>
            <Button onClick={handleBack} className="mt-4">
              {t('backToPortfolio')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProfitable = asset.unrealizedPL > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <LazyImage
              src={asset.logoUrl || ""}
              alt={asset.asset.symbol}
              fallback={
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                  {asset.asset.symbol.slice(0, 2)}
                </div>
              }
            />
            <div>
              <h1 className="text-2xl font-bold">{asset.asset.name}</h1>
              <p className="text-muted-foreground">{asset.asset.symbol}</p>
            </div>
          </div>
        </div>
        <Badge variant={isProfitable ? "default" : "destructive"} className="text-lg px-3 py-1">
          {isProfitable ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          {formatPercent(asset.unrealizedPLPercent, 2)}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('currentPrice')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(asset.currentPrice || 0)}</div>
            {asset.priceChange24h && (
              <p className={`text-xs ${asset.priceChange24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {asset.priceChange24h > 0 ? '+' : ''}{formatPercent(asset.priceChange24h, 2)} {t('24h')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('holdings')}</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCrypto(asset.totalQuantity, asset.asset?.symbol)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(asset.currentValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgBuyPrice')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(asset.avgBuyPrice)}</div>
            <p className="text-xs text-muted-foreground">
              {formatVnd(asset.vnd?.avgBuyPrice || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('unrealizedPL')}</CardTitle>
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {isProfitable ? '+' : ''}{formatCurrency(asset.unrealizedPL)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatVnd(asset.vnd?.unrealizedPL || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">{t('all')}</TabsTrigger>
              <TabsTrigger value="buy">{t('buys')}</TabsTrigger>
              <TabsTrigger value="sell">{t('sells')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <TransactionsTable
                transactions={transactions || []}
                filter="all"
                t={t}
                assetSymbol={asset.asset.symbol}
                onEdit={setEditingTransaction}
              />
            </TabsContent>

            <TabsContent value="buy">
              <TransactionsTable
                transactions={transactions?.filter((tx: any) => tx.type === 'buy') || []}
                filter="buy"
                t={t}
                assetSymbol={asset.asset.symbol}
                onEdit={setEditingTransaction}
              />
            </TabsContent>

            <TabsContent value="sell">
              <TransactionsTable
                transactions={transactions?.filter((tx: any) => tx.type === 'sell') || []}
                filter="sell"
                t={t}
                assetSymbol={asset.asset.symbol}
                onEdit={setEditingTransaction}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <EditCryptoTransactionDialog
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          transaction={editingTransaction}
          assetSymbol={asset.asset.symbol}
          onSuccess={() => {
            refetchTransactions();
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
}

function TransactionsTable({
  transactions,
  filter,
  t,
  assetSymbol,
  onEdit
}: {
  transactions: any[];
  filter: string;
  t: any;
  assetSymbol: string;
  onEdit: (tx: any) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('noTransactions', { type: filter === 'all' ? '' : filter })}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('date')}</TableHead>
          <TableHead>{t('type')}</TableHead>
          <TableHead className="text-right">{t('quantity')}</TableHead>
          <TableHead className="text-right">{t('price')}</TableHead>
          <TableHead className="text-right">{t('total')}</TableHead>
          <TableHead className="text-right">{t('fee')}</TableHead>
          <TableHead>{t('source')}</TableHead>
          <TableHead>{t('exchange')}</TableHead>
          <TableHead className="w-[50px]">{t('actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id} className="group">
            <TableCell>
              {format(new Date(tx.transactionDate), 'dd/MM/yyyy HH:mm')}
            </TableCell>
            <TableCell>
              <Badge variant={tx.type === 'buy' ? 'default' : 'destructive'}>
                {t(tx.type)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{formatCrypto(tx.quantity, assetSymbol)}</TableCell>
            <TableCell className="text-right">{formatCurrency(tx.pricePerUnit)}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(tx.quantity * tx.pricePerUnit)}
            </TableCell>
            <TableCell className="text-right">
              {tx.fee > 0 ? formatCurrency(tx.fee) : '-'}
            </TableCell>
            <TableCell>
              {(tx.totalAmount === 0 || tx.notes?.includes('Purchased with USDT')) ? (
                <Badge variant="outline">USDT</Badge>
              ) : (
                <span className="text-muted-foreground">Cash</span>
              )}
            </TableCell>
            <TableCell>{tx.exchange || '-'}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => onEdit(tx)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {t('edit')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}