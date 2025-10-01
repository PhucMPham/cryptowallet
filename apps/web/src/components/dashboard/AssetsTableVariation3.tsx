"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
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

interface AssetsTableVariation3Props {
	assets: Asset[];
}

export function AssetsTableVariation3({ assets }: AssetsTableVariation3Props) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("vi-VN", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	};

	return (
		<div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
			<div className="bg-muted/30 px-6 py-5 border-b border-border">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
							Assets
						</h2>
						<p className="text-muted-foreground text-sm mt-1">
							Total: ₫{formatCurrency(assets.reduce((sum, a) => sum + a.total, 0))}
						</p>
					</div>
					<Button variant="default" size="sm">
						See More Assets
					</Button>
				</div>
			</div>

			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent border-b border-border bg-muted/10">
							<TableHead className="font-bold text-foreground uppercase text-xs tracking-wider">Name</TableHead>
							<TableHead className="text-right font-bold text-foreground uppercase text-xs tracking-wider">Amount</TableHead>
							<TableHead className="text-right font-bold text-foreground uppercase text-xs tracking-wider">24h Change</TableHead>
							<TableHead className="text-right font-bold text-foreground uppercase text-xs tracking-wider">Price</TableHead>
							<TableHead className="text-right font-bold text-foreground uppercase text-xs tracking-wider">Total</TableHead>
							<TableHead className="text-right font-bold text-foreground uppercase text-xs tracking-wider">Avg Buy</TableHead>
							<TableHead className="text-right font-bold text-foreground uppercase text-xs tracking-wider">P/L All Time</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{assets.map((asset, index) => (
							<TableRow
								key={asset.id}
								className={`border-b border-border/50 hover:bg-muted/20 ${index % 2 === 0 ? "bg-muted/5" : ""}`}
							>
								<TableCell className="py-4">
									<div className="flex items-center gap-3">
										<div
											className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
											style={{ backgroundColor: asset.iconColor }}
										>
											{asset.symbol.charAt(0)}
										</div>
										<div>
											<p className="font-bold text-foreground text-base">{asset.name}</p>
											<p className="text-xs text-muted-foreground font-medium">{asset.symbol}</p>
										</div>
									</div>
								</TableCell>
								<TableCell className="text-right">
									<span className="font-bold text-foreground text-base">{asset.amount.toLocaleString()}</span>
								</TableCell>
								<TableCell className="text-right">
									<div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-bold ${
										asset.change24h >= 0
											? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
											: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
									}`}>
										{asset.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
										{Math.abs(asset.change24h).toFixed(2)}%
									</div>
								</TableCell>
								<TableCell className="text-right">
									<span className="font-semibold text-foreground">₫{formatCurrency(asset.price)}</span>
								</TableCell>
								<TableCell className="text-right">
									<span className="font-bold text-foreground text-base">₫{formatCurrency(asset.total)}</span>
								</TableCell>
								<TableCell className="text-right">
									<span className="text-muted-foreground font-medium">₫{formatCurrency(asset.avgBuy)}</span>
								</TableCell>
								<TableCell className="text-right">
									<div className={`inline-block px-3 py-2 rounded-lg ${
										asset.profitLoss >= 0
											? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
											: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
									}`}>
										<p className={`font-bold text-base ${
											asset.profitLoss >= 0
												? "text-green-700 dark:text-green-400"
												: "text-red-700 dark:text-red-400"
										}`}>
											{asset.profitLoss >= 0 ? "+" : ""}₫{formatCurrency(asset.profitLoss)}
										</p>
										<p className={`text-xs font-semibold mt-0.5 ${
											asset.profitLossPercent >= 0
												? "text-green-600 dark:text-green-500"
												: "text-red-600 dark:text-red-500"
										}`}>
											{asset.profitLossPercent >= 0 ? "▲" : "▼"} {Math.abs(asset.profitLossPercent).toFixed(2)}%
										</p>
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
