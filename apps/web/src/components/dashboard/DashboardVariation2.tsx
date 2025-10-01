"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Clock, ArrowRightLeft } from "lucide-react";

interface DashboardVariation2Props {
	totalWorth: number;
	change: number;
	changePercent: number;
	currency: string;
}

export function DashboardVariation2({
	totalWorth,
	change,
	changePercent,
	currency = "VND",
}: DashboardVariation2Props) {
	const isPositive = change >= 0;

	return (
		<div className="space-y-6">
			{/* Glass Header Section */}
			<div className="relative overflow-hidden rounded-3xl">
				{/* Background gradient */}
				<div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 dark:from-purple-600/30 dark:via-blue-600/30 dark:to-cyan-600/30" />

				{/* Glass effect */}
				<div className="relative backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 border border-white/20 dark:border-zinc-700/50 p-8">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wide">
								Total Worth
							</p>
							<div className="mb-4">
								<h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400">
									{currency === "VND" ? "₫" : "$"}
									{totalWorth.toLocaleString("en-US", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</h1>
							</div>
							<div className="flex items-center gap-3">
								<div
									className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm ${
										isPositive
											? "bg-green-500/20 border border-green-500/30"
											: "bg-red-500/20 border border-red-500/30"
									}`}
								>
									{isPositive ? (
										<ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
									) : (
										<ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
									)}
									<span
										className={`text-sm font-bold ${
											isPositive
												? "text-green-700 dark:text-green-300"
												: "text-red-700 dark:text-red-300"
										}`}
									>
										{isPositive ? "+" : ""}
										{currency === "VND" ? "₫" : "$"}
										{Math.abs(change).toLocaleString("en-US", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>
								<div
									className={`flex items-center gap-1 px-3 py-1.5 rounded-full backdrop-blur-sm ${
										isPositive
											? "bg-green-500/20 border border-green-500/30"
											: "bg-red-500/20 border border-red-500/30"
									}`}
								>
									<span
										className={`text-sm font-bold ${
											isPositive
												? "text-green-700 dark:text-green-300"
												: "text-red-700 dark:text-red-300"
										}`}
									>
										{changePercent.toFixed(2)}%
									</span>
								</div>
								<span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50">
									24H
								</span>
							</div>
						</div>
						{/* Floating mini chart */}
						<div className="relative">
							<div className="w-48 h-20 flex items-end gap-1 backdrop-blur-sm bg-white/30 dark:bg-zinc-800/30 rounded-2xl p-3 border border-white/20 dark:border-zinc-700/30">
								{[30, 45, 35, 55, 40, 60, 50, 65, 55, 70, 60, 75].map((height, i) => (
									<div
										key={i}
										className={`flex-1 rounded-full ${
											isPositive
												? "bg-gradient-to-t from-green-400 via-emerald-400 to-teal-400"
												: "bg-gradient-to-t from-red-400 via-rose-400 to-pink-400"
										}`}
										style={{ height: `${height}%` }}
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Floating Action Buttons */}
			<div className="grid grid-cols-4 gap-4">
				<Button
					variant="ghost"
					className="h-auto flex-col gap-3 py-6 backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 border border-white/20 dark:border-zinc-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all"
				>
					<div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
						<Wallet className="h-6 w-6 text-white" />
					</div>
					<span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Receive</span>
				</Button>
				<Button
					variant="ghost"
					className="h-auto flex-col gap-3 py-6 backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 border border-white/20 dark:border-zinc-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all"
				>
					<div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
						<TrendingUp className="h-6 w-6 text-white" />
					</div>
					<span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Earn</span>
				</Button>
				<Button
					variant="ghost"
					className="h-auto flex-col gap-3 py-6 backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 border border-white/20 dark:border-zinc-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all"
				>
					<div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
						<Clock className="h-6 w-6 text-white" />
					</div>
					<span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Time Machine</span>
				</Button>
				<Button className="h-auto flex-col gap-3 py-6 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-2xl shadow-lg hover:shadow-xl transition-all border-0">
					<div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
						<ArrowRightLeft className="h-6 w-6 text-white" />
					</div>
					<span className="text-sm font-semibold text-white">Swap</span>
				</Button>
			</div>
		</div>
	);
}
