"use client";

import { memo, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatVnd, formatNumber, formatPercent } from "@/utils/formatters";
import { ArrowUp, ArrowDown } from "lucide-react";
import { LazyImage } from "./lazy-image";

interface AssetItem {
  asset: {
    id: number;
    symbol: string;
    name: string;
  };
  logoUrl?: string | null;
  totalQuantity: number;
  avgBuyPrice: number;
  currentPrice?: number | null;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  vnd?: {
    avgBuyPrice: number;
    currentValue: number;
    unrealizedPL: number;
  };
}

interface CryptoAssetsTableProps {
  assets: AssetItem[];
  onViewDetails: (assetId: number) => void;
}

const AssetRow = memo(({ item, onViewDetails }: { item: AssetItem; onViewDetails: (id: number) => void }) => {
  const t = useTranslations('crypto');
  const isProfitable = item.unrealizedPL > 0;
  const hasHoldings = item.totalQuantity > 0;

  return (
    <div className="flex items-center border-b py-4 px-2 hover:bg-muted/50 transition-colors">
      <div className="w-[150px] flex items-center gap-2">
        <LazyImage
          src={item.logoUrl || ""}
          alt={item.asset.symbol}
          fallback={
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
              {item.asset.symbol.slice(0, 2)}
            </div>
          }
        />
        <span className="font-medium">{item.asset.symbol}</span>
      </div>

      <div className="w-[200px]">
        <div className="font-medium">{item.asset.name}</div>
        {item.currentPrice && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {formatCurrency(item.currentPrice)}
            </span>
            {item.currentPrice !== item.avgBuyPrice && item.totalQuantity > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                item.currentPrice > item.avgBuyPrice
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {item.currentPrice > item.avgBuyPrice ? "↑" : "↓"}
                {formatPercent(Math.abs(((item.currentPrice - item.avgBuyPrice) / item.avgBuyPrice) * 100), 1)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="w-[100px] text-right">
        {formatNumber(item.totalQuantity)}
      </div>

      <div className="w-[150px] text-right">
        <div className="font-medium">
          {formatVnd(item.vnd?.avgBuyPrice || 0)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(item.avgBuyPrice)}
        </div>
      </div>

      <div className="w-[150px] text-right">
        {hasHoldings && item.currentValue > 0 ? (
          <div>
            <div className="font-semibold">
              {formatVnd(item.vnd?.currentValue || 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(item.currentValue)}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>

      <div className="w-[150px] text-right">
        {hasHoldings && item.currentPrice ? (
          <div className={`${isProfitable ? "text-green-600" : "text-red-600"}`}>
            <div className="flex items-center justify-end gap-1">
              {isProfitable ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <div>
                <div className="font-medium">
                  {formatVnd(Math.abs(item.vnd?.unrealizedPL || 0))}
                </div>
                <div className="text-xs">
                  {formatCurrency(Math.abs(item.unrealizedPL))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>

      <div className="w-[100px] text-right">
        {hasHoldings && item.currentPrice ? (
          <span className={`font-medium ${isProfitable ? "text-green-600" : "text-red-600"}`}>
            {item.unrealizedPLPercent >= 0 ? "+" : ""}
            {formatPercent(item.unrealizedPLPercent, 2)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>

      <div className="w-[120px] text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(item.asset.id)}
        >
          {t('viewDetails')}
        </Button>
      </div>
    </div>
  );
});

AssetRow.displayName = "AssetRow";

export const CryptoAssetsTable = memo(({ assets, onViewDetails }: CryptoAssetsTableProps) => {
  const t = useTranslations('crypto');
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: assets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 3,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('yourCryptoAssets')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            {t('noAssetsFound')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('yourCryptoAssets')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <div className="flex items-center border-b bg-muted/50 py-3 px-2 text-sm font-medium">
            <div className="w-[150px] whitespace-nowrap">{t('symbol')}</div>
            <div className="w-[200px] whitespace-nowrap">{t('namePrice')}</div>
            <div className="w-[100px] text-right whitespace-nowrap">{t('holdings')}</div>
            <div className="w-[150px] text-right whitespace-nowrap">{t('avgBuyPrice')}</div>
            <div className="w-[150px] text-right whitespace-nowrap">{t('currentValue')}</div>
            <div className="w-[150px] text-right whitespace-nowrap">{t('profitLoss')}</div>
            <div className="w-[100px] text-right whitespace-nowrap">{t('plPercent')}</div>
            <div className="w-[120px]"></div>
          </div>

          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ height: "400px" }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualItems.map((virtualItem) => (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <AssetRow
                    item={assets[virtualItem.index]}
                    onViewDetails={onViewDetails}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CryptoAssetsTable.displayName = "CryptoAssetsTable";