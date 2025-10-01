"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { AnimatedNumber } from "./AnimatedNumber";

interface DashboardVariation1Props {
	totalWorth: number;
	change: number;
	changePercent: number;
	currency: string;
	chartData?: { date: Date; value: number }[];
	onSyncAll?: () => void;
	onCreateSnapshot?: () => void;
}

export function DashboardVariation1({
	totalWorth,
	change,
	changePercent,
	currency = "VND",
	chartData = [],
	onSyncAll,
	onCreateSnapshot,
}: DashboardVariation1Props) {
	const isPositive = change >= 0;

	// Format chart data
	const formattedChartData = chartData.map((item) => ({
		date: new Date(item.date).getTime(),
		value: item.value,
	}));

	return (
		<div>
			{/* Header Section with Chart */}
			<div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
				<div className="flex items-center justify-between gap-6">
					{/* Left: Total Worth */}
					<div className="flex-shrink-0">
						<p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
							Total Worth :
						</p>
						<div className="flex items-baseline gap-2 mb-2">
							<h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
								<AnimatedNumber
									value={totalWorth}
									prefix={currency === "VND" ? "₫" : "$"}
									duration={800}
									formatOptions={{
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}}
								/>
							</h1>
							<Button
								onClick={onCreateSnapshot}
								variant="ghost"
								size="icon"
								className="h-6 w-6 text-orange-500 hover:text-orange-600 dark:hover:text-orange-400"
								title="Create new snapshot"
							>
								<RefreshCw className="h-4 w-4" />
							</Button>
						</div>
						<div className="flex items-center gap-2">
							<span
								className={`text-sm font-semibold ${
									isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
								}`}
							>
								<AnimatedNumber
									value={Math.abs(change)}
									prefix={`${isPositive ? "+" : "-"}${currency === "VND" ? "₫" : "$"}`}
									duration={800}
									formatOptions={{
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}}
								/>
							</span>
							<div
								className={`flex items-center gap-1 px-2 py-0.5 rounded ${
									isPositive ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
								}`}
							>
								{isPositive ? (
									<ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-500" />
								) : (
									<ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-500" />
								)}
								<span className={`text-xs font-semibold ${
									isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
								}`}>
									<AnimatedNumber
										value={Math.abs(changePercent)}
										prefix=""
										duration={800}
										formatOptions={{
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										}}
									/>
									%
								</span>
							</div>
							<span className="text-xs text-zinc-600 dark:text-zinc-400 px-2 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded">
								24H
							</span>
						</div>
					</div>

					{/* Center: Line Chart */}
					<div className="flex-1 h-20">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={formattedChartData}
								margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
							>
								<defs>
									<linearGradient id="gradientValue1" x1="0" y1="0" x2="1" y2="0">
										<stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
										<stop offset="50%" stopColor="#a855f7" stopOpacity={0.6} />
										<stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
									</linearGradient>
									<linearGradient id="fillGradient1" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
									</linearGradient>
								</defs>
								<XAxis dataKey="date" hide />
								<Tooltip
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
											currency === "VND"
												? `VND ${Number(value).toLocaleString("vi-VN", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
												  })}`
												: `$${Number(value).toLocaleString("en-US", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
												  })}`;

										return (
											<div className="bg-white dark:bg-zinc-800/95 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
												<p className="text-xs text-zinc-500 dark:text-zinc-300 mb-1">{formattedDate}</p>
												<p className="text-sm font-semibold text-zinc-900 dark:text-white">
													{formattedValue}
												</p>
											</div>
										);
									}}
								/>
								<Area
									dataKey="value"
									type="monotone"
									fill="url(#fillGradient1)"
									fillOpacity={1}
									stroke="url(#gradientValue1)"
									strokeWidth={2}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>

					{/* Right: Sync All Button */}
					<div className="flex-shrink-0">
						<Button
							onClick={onSyncAll}
							variant="outline"
							className="border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Sync All
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
