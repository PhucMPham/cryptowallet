"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Clock, ArrowRightLeft } from "lucide-react";

interface DashboardVariation3Props {
	totalWorth: number;
	change: number;
	changePercent: number;
	currency: string;
}

export function DashboardVariation3({
	totalWorth,
	change,
	changePercent,
	currency = "VND",
}: DashboardVariation3Props) {
	const isPositive = change >= 0;

	return (
		<div className="space-y-4">
			{/* Compact Header with Inline Chart */}
			<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					{/* Left: Stats */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-2">
							<h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
								Total Worth
							</h2>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
							>
								<RefreshCw className="h-3 w-3" />
							</Button>
						</div>
						<h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 truncate">
							{currency === "VND" ? "₫" : "$"}
							{totalWorth.toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</h1>
						<div className="flex items-center gap-2 flex-wrap">
							<div
								className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
									isPositive
										? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
										: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
								}`}
							>
								{isPositive ? (
									<ArrowUpRight className="h-3 w-3" />
								) : (
									<ArrowDownRight className="h-3 w-3" />
								)}
								{currency === "VND" ? "₫" : "$"}
								{Math.abs(change).toLocaleString("en-US", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</div>
							<div
								className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
									isPositive
										? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
										: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
								}`}
							>
								{isPositive ? "+" : ""}
								{changePercent.toFixed(2)}%
							</div>
							<span className="text-xs text-zinc-500 dark:text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
								24H
							</span>
						</div>
					</div>

					{/* Right: Inline Chart */}
					<div className="w-32 h-16 flex items-end gap-px">
						{[30, 45, 35, 55, 40, 60, 50, 65, 55, 70, 60, 75].map((height, i) => (
							<div
								key={i}
								className={`flex-1 rounded-t ${
									isPositive
										? "bg-green-500 dark:bg-green-600"
										: "bg-red-500 dark:bg-red-600"
								}`}
								style={{ height: `${height}%`, opacity: 0.3 + (i / 12) * 0.7 }}
							/>
						))}
					</div>
				</div>
			</div>

			{/* Compact Action Grid */}
			<div className="grid grid-cols-4 gap-3">
				<Button
					variant="outline"
					className="flex-col h-auto py-3 gap-1.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
				>
					<Wallet className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
					<span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
						Receive
					</span>
				</Button>
				<Button
					variant="outline"
					className="flex-col h-auto py-3 gap-1.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
				>
					<TrendingUp className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
					<span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Earn</span>
				</Button>
				<Button
					variant="outline"
					className="flex-col h-auto py-3 gap-1.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
				>
					<Clock className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
					<span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
						Time Machine
					</span>
				</Button>
				<Button className="flex-col h-auto py-3 gap-1.5 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700">
					<ArrowRightLeft className="h-4 w-4 text-white" />
					<span className="text-xs font-medium text-white">Swap</span>
				</Button>
			</div>
		</div>
	);
}
