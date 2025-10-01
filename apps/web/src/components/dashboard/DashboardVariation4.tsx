"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Clock, ArrowRightLeft, Sparkles } from "lucide-react";

interface DashboardVariation4Props {
	totalWorth: number;
	change: number;
	changePercent: number;
	currency: string;
}

export function DashboardVariation4({
	totalWorth,
	change,
	changePercent,
	currency = "VND",
}: DashboardVariation4Props) {
	const isPositive = change >= 0;

	return (
		<div className="space-y-6">
			{/* Bold Gradient Header */}
			<div className="relative overflow-hidden rounded-3xl shadow-2xl">
				{/* Animated gradient background */}
				<div className={`absolute inset-0 ${
					isPositive
						? "bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600"
						: "bg-gradient-to-br from-red-500 via-rose-600 to-pink-600"
				}`}>
					<div className="absolute inset-0 opacity-30">
						<div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
						<div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
					</div>
				</div>

				{/* Content */}
				<div className="relative p-8">
					<div className="flex items-start justify-between mb-6">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-3">
								<Sparkles className="h-4 w-4 text-white/80" />
								<p className="text-sm font-bold text-white/90 uppercase tracking-wider">
									Total Worth
								</p>
							</div>
							<div className="mb-4">
								<h1 className="text-5xl font-black text-white drop-shadow-lg">
									{currency === "VND" ? "₫" : "$"}
									{totalWorth.toLocaleString("en-US", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</h1>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
									{isPositive ? (
										<ArrowUpRight className="h-5 w-5 text-white" />
									) : (
										<ArrowDownRight className="h-5 w-5 text-white" />
									)}
									<span className="text-lg font-black text-white">
										{isPositive ? "+" : ""}
										{currency === "VND" ? "₫" : "$"}
										{Math.abs(change).toLocaleString("en-US", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>
								<div className="flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
									<span className="text-lg font-black text-white">
										{isPositive ? "+" : ""}
										{changePercent.toFixed(2)}%
									</span>
								</div>
							</div>
						</div>

						{/* Refresh button */}
						<Button
							variant="ghost"
							size="icon"
							className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white"
						>
							<RefreshCw className="h-5 w-5" />
						</Button>
					</div>

					{/* Integrated chart bar */}
					<div className="flex items-end gap-1 h-20">
						{[30, 45, 35, 55, 40, 60, 50, 65, 55, 70, 60, 75, 65, 80].map((height, i) => (
							<div
								key={i}
								className="flex-1 rounded-t-lg bg-white/30 backdrop-blur-sm border-t border-white/40"
								style={{ height: `${height}%` }}
							/>
						))}
					</div>

					{/* 24H badge */}
					<div className="absolute top-4 right-4">
						<div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
							<span className="text-xs font-bold text-white uppercase">24H</span>
						</div>
					</div>
				</div>
			</div>

			{/* Bold Action Buttons */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<Button
					variant="outline"
					className="h-auto flex-col gap-3 py-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900 dark:hover:to-purple-800 shadow-lg hover:shadow-xl transition-all"
				>
					<div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
						<Wallet className="h-7 w-7 text-white" />
					</div>
					<span className="text-base font-bold text-purple-700 dark:text-purple-300">
						Receive
					</span>
				</Button>

				<Button
					variant="outline"
					className="h-auto flex-col gap-3 py-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900 dark:hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
				>
					<div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
						<TrendingUp className="h-7 w-7 text-white" />
					</div>
					<span className="text-base font-bold text-blue-700 dark:text-blue-300">Earn</span>
				</Button>

				<Button
					variant="outline"
					className="h-auto flex-col gap-3 py-6 rounded-2xl border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 hover:from-cyan-100 hover:to-cyan-200 dark:hover:from-cyan-900 dark:hover:to-cyan-800 shadow-lg hover:shadow-xl transition-all"
				>
					<div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg">
						<Clock className="h-7 w-7 text-white" />
					</div>
					<span className="text-base font-bold text-cyan-700 dark:text-cyan-300">
						Time Machine
					</span>
				</Button>

				<Button className="h-auto flex-col gap-3 py-6 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 shadow-xl hover:shadow-2xl transition-all border-0">
					<div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
						<ArrowRightLeft className="h-7 w-7 text-white" />
					</div>
					<span className="text-base font-bold text-white">Swap</span>
				</Button>
			</div>
		</div>
	);
}
