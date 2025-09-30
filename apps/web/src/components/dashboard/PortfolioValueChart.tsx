"use client";

import { useState } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { format } from "date-fns";

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
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
	{ value: "1D", label: "1D" },
	{ value: "1W", label: "1W" },
	{ value: "1M", label: "1M" },
	{ value: "3M", label: "3M" },
	{ value: "1Y", label: "1Y" },
	{ value: "ALL", label: "ALL" },
];

export function PortfolioValueChart({
	data,
	isLoading = false,
	displayCurrency = "VND",
}: PortfolioValueChartProps) {
	const [selectedRange, setSelectedRange] = useState<TimeRange>("1W");

	// Format data for chart
	const chartData = data.map((snapshot) => ({
		date: new Date(snapshot.snapshotDate).getTime(),
		value:
			displayCurrency === "VND"
				? snapshot.totalValueVnd
				: snapshot.totalValueUsd,
		formattedDate: format(new Date(snapshot.snapshotDate), "MMM dd, HH:mm"),
	}));

	// Custom tooltip
	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length) {
			const value = payload[0].value;
			const formattedValue =
				displayCurrency === "VND"
					? `₫${value.toLocaleString("vi-VN", {
							minimumFractionDigits: 0,
							maximumFractionDigits: 0,
					  })}`
					: `$${value.toLocaleString("en-US", {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
					  })}`;

			return (
				<div className="bg-popover border border-border rounded-lg shadow-lg p-3">
					<p className="text-xs text-muted-foreground mb-1">
						{payload[0].payload.formattedDate}
					</p>
					<p className="text-sm font-semibold text-foreground">
						{formattedValue}
					</p>
				</div>
			);
		}
		return null;
	};

	// Format Y-axis
	const formatYAxis = (value: number) => {
		if (displayCurrency === "VND") {
			return `₫${(value / 1_000_000).toFixed(0)}M`;
		}
		return `$${(value / 1000).toFixed(0)}K`;
	};

	// Format X-axis
	const formatXAxis = (timestamp: number) => {
		return format(new Date(timestamp), "MMM dd");
	};

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
						<div className="text-center">
							<p className="text-muted-foreground mb-2">
								No historical data available yet
							</p>
							<p className="text-xs text-muted-foreground">
								Portfolio snapshots will appear here over time
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Portfolio Value</CardTitle>
					<div className="flex gap-1">
						{TIME_RANGES.map((range) => (
							<Button
								key={range.value}
								variant={selectedRange === range.value ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedRange(range.value)}
								className="h-8 px-3 text-xs"
							>
								{range.label}
							</Button>
						))}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={300}>
					<LineChart
						data={chartData}
						margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
					>
						<defs>
							<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="hsl(var(--primary))"
									stopOpacity={0.3}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--primary))"
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="hsl(var(--border))"
							opacity={0.3}
						/>
						<XAxis
							dataKey="date"
							tickFormatter={formatXAxis}
							stroke="hsl(var(--muted-foreground))"
							fontSize={12}
							tickLine={false}
						/>
						<YAxis
							tickFormatter={formatYAxis}
							stroke="hsl(var(--muted-foreground))"
							fontSize={12}
							tickLine={false}
							axisLine={false}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Line
							type="monotone"
							dataKey="value"
							stroke="hsl(var(--primary))"
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
							fill="url(#colorValue)"
						/>
					</LineChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}