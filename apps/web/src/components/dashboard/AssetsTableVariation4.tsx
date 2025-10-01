"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
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

interface AssetsTableVariation4Props {
	assets: Asset[];
}

export function AssetsTableVariation4({ assets }: AssetsTableVariation4Props) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("vi-VN", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground">Assets</h2>
					<p className="text-sm text-muted-foreground mt-0.5">
						₫{formatCurrency(assets.reduce((sum, a) => sum + a.total, 0))}
					</p>
				</div>
				<Button variant="outline" size="sm" className="border-2">
					See More Assets
				</Button>
			</div>

			<div className="bg-background rounded-xl border border-border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent border-none bg-muted/50">
							<TableHead className="font-bold text-foreground">Name</TableHead>
							<TableHead className="text-right font-bold text-foreground">Amount</TableHead>
							<TableHead className="text-right font-bold text-foreground">24h Change</TableHead>
							<TableHead className="text-right font-bold text-foreground">Price</TableHead>
							<TableHead className="text-right font-bold text-foreground">Total</TableHead>
							<TableHead className="text-right font-bold text-foreground">Avg Buy<br /><span className="text-xs font-normal text-muted-foreground">All Time</span></TableHead>
							<TableHead className="text-right font-bold text-foreground">P/L<br /><span className="text-xs font-normal text-muted-foreground">All Time</span></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{assets.map((asset, index) => (
							<TableRow
								key={asset.id}
								className={`border-none hover:bg-muted/40 transition-colors ${
									index % 2 === 1 ? "bg-muted/20" : "bg-transparent"
								}`}
							>
								<TableCell className="py-4">
									<div className="flex items-center gap-3">
										<div className="relative">
											<div
												className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
												style={{ backgroundColor: asset.iconColor }}
											>
												{asset.symbol.charAt(0)}
											</div>
										</div>
										<div>
											<p className="font-bold text-foreground">{asset.name}</p>
											<p className="text-sm text-muted-foreground">{asset.symbol}</p>
										</div>
									</div>
								</TableCell>
								<TableCell className="text-right">
									<span className="font-semibold text-foreground">{asset.amount.toLocaleString()}</span>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<div className={`flex items-center gap-1 font-bold ${
											asset.change24h >= 0
												? "text-green-600 dark:text-green-500"
												: "text-red-600 dark:text-red-500"
										}`}>
											{asset.change24h >= 0 ? (
												<TrendingUp className="w-4 h-4" />
											) : (
												<TrendingDown className="w-4 h-4" />
											)}
											<span>{Math.abs(asset.change24h).toFixed(2)}%</span>
										</div>
									</div>
								</TableCell>
								<TableCell className="text-right">
									<span className="font-medium text-foreground">₫{formatCurrency(asset.price)}</span>
								</TableCell>
								<TableCell className="text-right">
									<span className="font-bold text-foreground">₫{formatCurrency(asset.total)}</span>
								</TableCell>
								<TableCell className="text-right">
									<span className="text-muted-foreground font-medium">₫{formatCurrency(asset.avgBuy)}</span>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex flex-col items-end">
										<span className={`font-bold ${
											asset.profitLoss >= 0
												? "text-green-600 dark:text-green-500"
												: "text-red-600 dark:text-red-500"
										}`}>
											{asset.profitLoss >= 0 ? "+" : ""}₫{formatCurrency(asset.profitLoss)}
										</span>
										<span className={`text-sm font-semibold ${
											asset.profitLossPercent >= 0
												? "text-green-600 dark:text-green-500"
												: "text-red-600 dark:text-red-500"
										}`}>
											{asset.profitLossPercent >= 0 ? "▲" : "▼"} {Math.abs(asset.profitLossPercent).toFixed(2)}%
										</span>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
