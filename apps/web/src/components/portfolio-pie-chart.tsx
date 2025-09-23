"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatVnd, formatPercent } from "@/utils/formatters";
import Image from "next/image";
import { getCryptoLogo } from "@/utils/crypto-logos";

interface PortfolioPieChartProps {
  assets: any[];
  totalPortfolioValueUSD: number;
  vndRate: number;
}

// Define colors for the pie chart segments
const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#84CC16", // Lime
];

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <div className="flex items-center gap-2 mb-1">
          <Image
            src={getCryptoLogo(data.payload.symbol)}
            alt={data.payload.symbol}
            width={20}
            height={20}
            className="rounded-full"
          />
          <span className="font-semibold">{data.payload.symbol}</span>
        </div>
        <p className="text-sm text-muted-foreground">{data.payload.name}</p>
        <p className="text-sm font-medium mt-1">
          {formatVnd(data.payload.valueVND)}
        </p>
        <p className="text-sm text-muted-foreground">
          ≈ ${data.payload.value.toFixed(2)} USD
        </p>
        <p className="text-sm font-semibold text-primary mt-1">
          {formatPercent(data.payload.percentage)}
        </p>
      </div>
    );
  }
  return null;
};

// Custom label component for the pie chart
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
  symbol,
}: any) => {
  // Only show label if percentage is greater than 5%
  if (percentage < 5) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="font-medium text-xs"
    >
      {`${symbol}`}
    </text>
  );
};

// Custom legend component
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {payload?.map((entry: any, index: number) => {
        // Handle the legend data structure from Recharts
        const data = entry.payload || entry;
        const symbol = data.symbol || data.value?.symbol || '';
        const percentage = data.percentage || data.value?.percentage || 0;

        if (!symbol) return null;

        return (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color || data.fill }}
            />
            <div className="flex items-center gap-1 text-sm">
              <Image
                src={getCryptoLogo(symbol)}
                alt={symbol}
                width={16}
                height={16}
                className="rounded-full"
              />
              <span className="font-medium">{symbol}</span>
              <span className="text-muted-foreground">
                ({formatPercent(percentage)})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PortfolioPieChart = ({
  assets,
  totalPortfolioValueUSD,
  vndRate,
}: PortfolioPieChartProps) => {
  // Filter assets with actual holdings
  const validAssets = assets?.filter(asset => asset.totalQuantity > 0) || [];

  // If no data, show a message
  if (validAssets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No assets in portfolio
      </div>
    );
  }

  // Calculate total value from assets (use quantity if currentValue is 0)
  const totalValue = totalPortfolioValueUSD > 0
    ? totalPortfolioValueUSD
    : validAssets.reduce((sum, asset) => sum + (asset.totalQuantity || 0), 0);

  // Prepare data for the pie chart
  const chartData = validAssets
    .map((asset, index) => {
      // Use currentValue if available, otherwise use quantity for equal distribution
      const assetValue = totalPortfolioValueUSD > 0 ? asset.currentValue : asset.totalQuantity;
      const percentage = (assetValue / totalValue) * 100;

      // Use more decimals for very small percentages
      const decimals = percentage < 0.01 ? 4 : 2;
      const formattedPercent = !isNaN(percentage) && isFinite(percentage)
        ? formatPercent(percentage, decimals)
        : '0.00%';

      return {
        name: `${asset.asset.symbol} (${formattedPercent})`,
        symbol: asset.asset.symbol,
        value: asset.currentValue,
        valueVND: asset.currentValue * vndRate,
        percentage: !isNaN(percentage) && isFinite(percentage) ? percentage : 0,
        fill: COLORS[index % COLORS.length],
      };
    })
    .filter(item => item.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  // If all percentages are 0, show message
  if (chartData.length === 0 || chartData.every(item => item.percentage === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No portfolio value to display
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="percentage"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{
              paddingTop: "20px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};