"use client";

import { memo } from "react";
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatVnd } from "@/utils/formatters";
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";

interface PortfolioSummaryProps {
  portfolio?: {
    totalInvested: number;
    totalSold: number;
    totalCryptoSold: number;
    usdtUsedForPayments: number;
    assetCount: number;
    totalValue?: number;
    vnd?: {
      totalInvested: number;
      totalSold: number;
      totalCryptoSold: number;
      usdtUsedForPayments: number;
      netInvested: number;
      totalValue?: number;
    };
  };
  isLoading?: boolean;
}

const SummaryCard = memo(({
  title,
  value,
  subValue,
  icon: Icon,
  isLoading
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  isLoading?: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis flex-1 mr-2">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div>
          <div className="h-8 bg-muted animate-pulse rounded mb-2" />
          {subValue !== undefined && (
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          )}
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold text-primary">{value}</div>
          {subValue && (
            <div className="text-sm text-muted-foreground">{subValue}</div>
          )}
        </>
      )}
    </CardContent>
  </Card>
));

SummaryCard.displayName = "SummaryCard";

export const PortfolioSummary = memo(({ portfolio, isLoading }: PortfolioSummaryProps) => {
  const t = useTranslations('crypto');
  const netInvested = portfolio ? portfolio.totalInvested - portfolio.totalSold : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <SummaryCard
        title={t('totalInvested')}
        value={formatVnd(portfolio?.vnd?.totalInvested || 0)}
        subValue={formatCurrency(portfolio?.totalInvested || 0)}
        icon={DollarSign}
        isLoading={isLoading}
      />

      <SummaryCard
        title={t('totalCryptoSold')}
        value={formatVnd(portfolio?.vnd?.totalCryptoSold || 0)}
        subValue={formatCurrency(portfolio?.totalCryptoSold || 0)}
        icon={TrendingUp}
        isLoading={isLoading}
      />

      <SummaryCard
        title={t('usdtUsedForPayments')}
        value={formatVnd(portfolio?.vnd?.usdtUsedForPayments || 0)}
        subValue={formatCurrency(portfolio?.usdtUsedForPayments || 0)}
        icon={CreditCard}
        isLoading={isLoading}
      />

      <SummaryCard
        title={t('netInvested')}
        value={formatVnd(portfolio?.vnd?.netInvested || 0)}
        subValue={formatCurrency(netInvested)}
        icon={Wallet}
        isLoading={isLoading}
      />

      <SummaryCard
        title={t('totalValue')}
        value={formatVnd(portfolio?.vnd?.totalValue || 0)}
        subValue={formatCurrency(portfolio?.totalValue || 0)}
        icon={TrendingDown}
        isLoading={isLoading}
      />
    </div>
  );
});

PortfolioSummary.displayName = "PortfolioSummary";