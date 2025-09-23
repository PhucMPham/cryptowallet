"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatVnd } from "@/utils/formatters";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface PortfolioSummaryProps {
  portfolio?: {
    totalInvested: number;
    totalSold: number;
    assetCount: number;
    vnd?: {
      totalInvested: number;
      totalSold: number;
      netInvested: number;
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
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
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
  const netInvested = portfolio ? portfolio.totalInvested - portfolio.totalSold : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Total Invested"
        value={formatVnd(portfolio?.vnd?.totalInvested || 0)}
        subValue={formatCurrency(portfolio?.totalInvested || 0)}
        icon={DollarSign}
        isLoading={isLoading}
      />

      <SummaryCard
        title="Total Sold"
        value={formatVnd(portfolio?.vnd?.totalSold || 0)}
        subValue={formatCurrency(portfolio?.totalSold || 0)}
        icon={TrendingUp}
        isLoading={isLoading}
      />

      <SummaryCard
        title="Net Invested"
        value={formatVnd(portfolio?.vnd?.netInvested || 0)}
        subValue={formatCurrency(netInvested)}
        icon={Wallet}
        isLoading={isLoading}
      />

      <SummaryCard
        title="Total Assets"
        value={portfolio?.assetCount || 0}
        icon={TrendingDown}
        isLoading={isLoading}
      />
    </div>
  );
});

PortfolioSummary.displayName = "PortfolioSummary";