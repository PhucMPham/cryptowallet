"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { format } from "date-fns";
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

interface PortfolioSnapshot {
	id: number;
	totalValueUsd: number;
	totalValueVnd: number;
	snapshotDate: Date;
}

interface PortfolioValueChartProps {
	data: PortfolioSnapshot[];
	isLoading?: boolean;
	displayCurrency?: "VND" | "USD";
	selectedRange?: TimeRange;
	onRangeChange?: (range: TimeRange) => void;
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
	{ value: "1D", label: "1D" },
	{ value: "1W", label: "1W" },
	{ value: "1M", label: "1M" },
	{ value: "3M", label: "3M" },
	{ value: "1Y", label: "1Y" },
	{ value: "ALL", label: "ALL" },
];

const chartConfig = {
	value: {
		label: "Portfolio Value",
	},
} satisfies ChartConfig;

export function PortfolioValueChart({
	data,
	isLoading = false,
	displayCurrency = "VND",
	selectedRange: externalRange,
	onRangeChange,
}: PortfolioValueChartProps) {
	const [internalRange, setInternalRange] = useState<TimeRange>("1D");
	const selectedRange = externalRange ?? internalRange;

	const handleRangeChange = (range: TimeRange) => {
		if (onRangeChange) {
			onRangeChange(range);
		} else {
			setInternalRange(range);
		}
	};

	// Format data for chart
	const chartData = data.map((snapshot) => ({
		date: new Date(snapshot.snapshotDate).getTime(),
		value:
			displayCurrency === "VND"
				? snapshot.totalValueVnd
				: snapshot.totalValueUsd,
		formattedDate: format(new Date(snapshot.snapshotDate), "MMM dd, HH:mm"),
	}));

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Portfolio Value</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[300px] flex items-center justify-center">
						<p className="text-muted-foreground">Loading chart...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!data || data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Portfolio Value</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[300px] flex items-center justify-center">
						<p className="text-muted-foreground">
							No historical data available yet. Create some portfolio snapshots
							to see the chart.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Calculate high and low values
	const values = chartData.map((d) => d.value);
	const highValue = Math.max(...values);
	const lowValue = Math.min(...values);
	const highPoint = chartData.find((d) => d.value === highValue);
	const lowPoint = chartData.find((d) => d.value === lowValue);

	// Get latest data point for display
	const latestData = chartData[chartData.length - 1];
	const latestDate = latestData
		? format(new Date(latestData.date), "dd MMMM yyyy HH:mm")
		: "";
	const latestValue = latestData ? latestData.value : 0;
	const formattedValue =
		displayCurrency === "VND"
			? `VND ${Number(latestValue).toLocaleString("vi-VN", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
			  })}`
			: `$${Number(latestValue).toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
			  })}`;

	return (
		<Card className="bg-zinc-900 border-zinc-800">
			<CardContent className="pt-6">
				{/* Header with date and value */}
				<div className="mb-4 space-y-1">
					<p className="text-sm text-white">{latestDate}</p>
					<p className="text-xl font-semibold text-white">{formattedValue}</p>
				</div>

				<ChartContainer config={chartConfig} className="h-[400px] w-full">
					<AreaChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 12,
							right: 12,
							top: 40,
							bottom: 12,
						}}
					>
						<defs>
							<linearGradient id="gradientValue" x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
								<stop offset="50%" stopColor="#a855f7" stopOpacity={0.6} />
								<stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
							</linearGradient>
							<linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} stroke="#27272a" />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							stroke="#71717a"
							tick={{ fill: "#ffffff" }}
							tickFormatter={(value) => {
								return format(new Date(value), "HH:mm");
							}}
						/>
						<ChartTooltip
							cursor={false}
							content={({ active, payload }) => {
								if (!active || !payload || payload.length === 0) {
									return null;
								}

								const data = payload[0].payload;
								const dateValue = data.date;
								const value = data.value;

								const formattedDate = dateValue
									? format(new Date(dateValue), "dd MMM yyyy HH:mm")
									: "";

								const formattedValue =
									displayCurrency === "VND"
										? `₫${Number(value).toLocaleString("vi-VN", {
												minimumFractionDigits: 0,
												maximumFractionDigits: 0,
										  })}`
										: `$${Number(value).toLocaleString("en-US", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
										  })}`;

								return (
									<div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
										<p className="text-xs text-zinc-400 mb-1">{formattedDate}</p>
										<p className="text-sm font-semibold text-white">
											{formattedValue}
										</p>
									</div>
								);
							}}
						/>
						<Area
							dataKey="value"
							type="natural"
							fill="url(#fillGradient)"
							fillOpacity={1}
							stroke="url(#gradientValue)"
							strokeWidth={3}
						/>
					</AreaChart>
				</ChartContainer>

				{/* Time Range Buttons */}
				<div className="flex justify-center gap-2 mt-4">
					{TIME_RANGES.map((range) => (
						<Button
							key={range.value}
							variant={selectedRange === range.value ? "secondary" : "ghost"}
							size="sm"
							onClick={() => handleRangeChange(range.value)}
							className={`h-8 px-3 text-xs ${
								selectedRange === range.value
									? "bg-zinc-800 text-white"
									: "text-zinc-400 hover:text-white hover:bg-zinc-800"
							}`}
						>
							{range.label}
						</Button>
					))}
				</div>
			</CardContent>
		</Card>
	);
}