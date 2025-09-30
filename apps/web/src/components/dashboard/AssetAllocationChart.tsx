"use client";

import { useState } from "react";
import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
} from "@/components/ui/chart";

interface AssetAllocation {
	symbol: string;
	name: string;
	logoUrl?: string | null;
	quantity: number;
	currentValue: number;
	currentValueVnd: number;
	percentage: number;
}

interface AssetAllocationChartProps {
	assets: AssetAllocation[];
	totalValue: number;
	totalValueVnd: number;
	isLoading?: boolean;
	displayCurrency?: "VND" | "USD";
}

export function AssetAllocationChart({
	assets,
	totalValue,
	totalValueVnd,
	isLoading = false,
	displayCurrency = "VND",
}: AssetAllocationChartProps) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);

	// Vibrant color palette for chart segments (using hex colors for Recharts compatibility)
	const colorPalette = [
		"#f97316", // Orange
		"#3b82f6", // Blue
		"#8b5cf6", // Purple
		"#10b981", // Green
		"#eab308", // Yellow
		"#ec4899", // Pink
		"#06b6d4", // Cyan
	];

	// Create chart config dynamically based on assets
	const chartConfig = assets.reduce((config, asset, index) => {
		config[asset.symbol] = {
			label: asset.name,
			color: colorPalette[index % colorPalette.length],
		};
		return config;
	}, {} as ChartConfig);

	// Prepare data for pie chart with explicit fill colors
	const chartData = assets.map((asset, index) => ({
		asset: asset.symbol,
		value: asset.currentValue,
		valueVnd: asset.currentValueVnd,
		percentage: asset.percentage,
		name: asset.name,
		fill: colorPalette[index % colorPalette.length],
	}));

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Asset Allocation</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[400px] flex items-center justify-center">
						<p className="text-muted-foreground">Loading chart...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!assets || assets.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Asset Allocation</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[400px] flex items-center justify-center">
						<div className="text-center">
							<p className="text-muted-foreground mb-2">
								No assets in portfolio yet
							</p>
							<p className="text-xs text-muted-foreground">
								Add transactions to see your asset distribution
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Get active slice data
	const activeSlice = activeIndex !== null ? chartData[activeIndex] : null;
	const displayValue = activeSlice
		? displayCurrency === "VND"
			? activeSlice.valueVnd
			: activeSlice.value
		: displayCurrency === "VND"
		? totalValueVnd
		: totalValue;

	const formattedDisplayValue =
		displayCurrency === "VND"
			? `₫${Number(displayValue).toLocaleString("vi-VN", {
					minimumFractionDigits: 0,
					maximumFractionDigits: 0,
			  })}`
			: `$${Number(displayValue).toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
			  })}`;

	return (
		<Card className="bg-zinc-900 border-zinc-800">
			<CardContent className="pt-6">
				<div className="grid grid-cols-[1fr_200px] gap-8 items-center">
					{/* Donut Chart with Center Content */}
					<div className="relative flex items-center justify-center">
						<ChartContainer
							config={chartConfig}
							className="aspect-square h-[450px]"
						>
							<PieChart
								onMouseLeave={() => setActiveIndex(null)}
							>
								<Pie
									data={chartData}
									dataKey="value"
									nameKey="asset"
									innerRadius={110}
									outerRadius={160}
									strokeWidth={0}
									paddingAngle={1}
									onMouseEnter={(_, index) => setActiveIndex(index)}
									onClick={(_, index) => setActiveIndex(index)}
								>
									{chartData.map((entry, index) => (
										<Cell
											key={`cell-${index}`}
											fill={entry.fill}
											className="outline-none transition-opacity cursor-pointer"
											style={{
												opacity: activeIndex === null || activeIndex === index ? 1 : 0.6,
											}}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>

						{/* Center Content */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div className="text-center max-w-[180px]">
								{activeSlice && (
									<div className="text-sm text-zinc-400 mb-1">
										{activeSlice.asset}
									</div>
								)}
								<div className="text-xl font-bold text-white">
									{formattedDisplayValue}
								</div>
								{activeSlice && (
									<div className="text-sm text-zinc-400 mt-1">
										{activeSlice.percentage.toFixed(1)}%
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Legend */}
					<div className="flex flex-col gap-2.5">
						{chartData.map((item) => (
							<div key={item.asset} className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<div
										className="w-2.5 h-2.5 rounded-full"
										style={{ backgroundColor: item.fill }}
									/>
									<span className="text-sm font-medium text-white">
										{item.asset}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-zinc-400 font-mono tabular-nums">
										{item.percentage.toFixed(1)}%
									</span>
									<div
										className="h-0.5 w-8"
										style={{ backgroundColor: item.fill }}
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}