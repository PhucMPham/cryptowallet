"use client";

import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Asset {
	id: string;
	name: string;
	symbol: string;
	iconColor: string;
	amount: number;
	change24h: number;
	price: number;
	total: number;
	avgBuy: number;
	profitLoss: number;
	profitLossPercent: number;
}

interface AssetsTableVariation2Props {
	assets: Asset[];
}

export function AssetsTableVariation2({ assets }: AssetsTableVariation2Props) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("vi-VN", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between px-2">
				<h2 className="text-xl font-bold text-foreground">
					Assets{" "}
					<span className="text-muted-foreground font-normal text-base">
						₫{formatCurrency(assets.reduce((sum, a) => sum + a.total, 0))}
					</span>
				</h2>
				<Button variant="outline" size="sm">
					See More Assets
				</Button>
			</div>

			<div className="space-y-3">
				{assets.map((asset) => (
					<div
						key={asset.id}
						className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer"
					>
						<div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
							{/* Left: Icon and Name */}
							<div className="flex items-center gap-3">
								<div
									className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
									style={{ backgroundColor: asset.iconColor }}
								>
									{asset.symbol.charAt(0)}
								</div>
								<div>
									<p className="font-bold text-foreground text-lg">{asset.name}</p>
									<p className="text-sm text-muted-foreground">{asset.symbol}</p>
								</div>
							</div>

							{/* Center: Stats Grid */}
							<div className="grid grid-cols-5 gap-6">
								<div>
									<p className="text-xs text-muted-foreground mb-1">Amount</p>
									<p className="font-semibold text-foreground">{asset.amount.toLocaleString()}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground mb-1">24h Change</p>
									<div className={`flex items-center gap-1 font-semibold ${asset.change24h >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
										{asset.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
										{Math.abs(asset.change24h).toFixed(2)}%
									</div>
								</div>
								<div>
									<p className="text-xs text-muted-foreground mb-1">Price</p>
									<p className="font-semibold text-foreground">₫{formatCurrency(asset.price)}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground mb-1">Total</p>
									<p className="font-bold text-foreground">₫{formatCurrency(asset.total)}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground mb-1">Avg Buy</p>
									<p className="font-semibold text-muted-foreground">₫{formatCurrency(asset.avgBuy)}</p>
								</div>
							</div>

							{/* Right: P/L Badge */}
							<div className={`px-4 py-2 rounded-lg ${asset.profitLoss >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
								<p className="text-xs text-muted-foreground mb-0.5">P/L All Time</p>
								<p className={`font-bold text-lg ${asset.profitLoss >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
									{asset.profitLoss >= 0 ? "+" : "-"}₫{formatCurrency(Math.abs(asset.profitLoss))}
								</p>
								<p className={`text-sm font-semibold ${asset.profitLossPercent >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
									{asset.profitLossPercent >= 0 ? "▲" : "▼"} {Math.abs(asset.profitLossPercent).toFixed(2)}%
								</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
