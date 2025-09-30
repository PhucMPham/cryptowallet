"use client";

import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Legend,
	Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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

// Use the existing chart color palette from CSS variables
const CHART_COLORS = [
	"hsl(var(--chart-1))", // Orange
	"hsl(var(--chart-2))", // Blue
	"hsl(var(--chart-3))", // Purple
	"hsl(var(--chart-4))", // Green
	"hsl(var(--chart-5))", // Red
];

export function AssetAllocationChart({
	assets,
	totalValue,
	totalValueVnd,
	isLoading = false,
	displayCurrency = "VND",
}: AssetAllocationChartProps) {
	// Prepare data for pie chart
	const chartData = assets.map((asset) => ({
		name: asset.symbol,
		value: asset.percentage,
		actualValue:
			displayCurrency === "VND" ? asset.currentValueVnd : asset.currentValue,
		fullName: asset.name,
	}));

	// Custom tooltip
	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			const formattedValue =
				displayCurrency === "VND"
					? `₫${data.actualValue.toLocaleString("vi-VN", {
							minimumFractionDigits: 0,
							maximumFractionDigits: 0,
					  })}`
					: `$${data.actualValue.toLocaleString("en-US", {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
					  })}`;

			return (
				<div className="bg-popover border border-border rounded-lg shadow-lg p-3">
					<p className="text-sm font-semibold text-foreground mb-1">
						{data.name}
					</p>
					<p className="text-xs text-muted-foreground mb-1">{data.fullName}</p>
					<p className="text-sm font-medium text-foreground">
						{formattedValue}
					</p>
					<p className="text-xs text-muted-foreground">
						{data.value.toFixed(2)}%
					</p>
				</div>
			);
		}
		return null;
	};

	// Custom legend
	const CustomLegend = ({ payload }: any) => {
		return (
			<div className="flex flex-wrap gap-3 justify-center mt-4">
				{payload.map((entry: any, index: number) => (
					<div key={`legend-${index}`} className="flex items-center gap-2">
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="text-xs text-foreground font-medium">
							{entry.value}
						</span>
						<span className="text-xs text-muted-foreground">
							{entry.payload.value.toFixed(1)}%
						</span>
					</div>
				))}
			</div>
		);
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Asset Allocation</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[350px] flex items-center justify-center">
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
					<div className="h-[350px] flex items-center justify-center">
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

	return (
		<Card>
			<CardHeader>
				<CardTitle>Asset Allocation</CardTitle>
				<p className="text-sm text-muted-foreground mt-1">
					{displayCurrency === "VND"
						? `Total: ₫${totalValueVnd.toLocaleString("vi-VN")}`
						: `Total: $${totalValue.toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
						  })}`}
				</p>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={350}>
					<PieChart>
						<Pie
							data={chartData}
							cx="50%"
							cy="45%"
							innerRadius={60}
							outerRadius={100}
							paddingAngle={2}
							dataKey="value"
							label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
							labelLine={true}
						>
							{chartData.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={CHART_COLORS[index % CHART_COLORS.length]}
									className="stroke-background hover:opacity-80 transition-opacity"
									strokeWidth={2}
								/>
							))}
						</Pie>
						<Tooltip content={<CustomTooltip />} />
						<Legend content={<CustomLegend />} />
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}