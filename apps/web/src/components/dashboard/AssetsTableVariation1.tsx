"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, ArrowDownRight, MoreVertical, Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "./AnimatedNumber";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { useEffect, useRef, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

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

interface AssetsTableVariation1Props {
	assets: Asset[];
	onTransactionAdded?: () => void;
}

export function AssetsTableVariation1({ assets, onTransactionAdded }: AssetsTableVariation1Props) {
	const router = useRouter();
	const [flashingRows, setFlashingRows] = useState<Set<string>>(new Set());
	const prevAssetsRef = useRef<Asset[]>(assets);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>("");

	useEffect(() => {
		const changedIds = new Set<string>();
		assets.forEach((asset, index) => {
			const prevAsset = prevAssetsRef.current[index];
			if (prevAsset && (
				prevAsset.price !== asset.price ||
				prevAsset.total !== asset.total ||
				prevAsset.profitLoss !== asset.profitLoss
			)) {
				changedIds.add(asset.id);
			}
		});

		if (changedIds.size > 0) {
			setFlashingRows(changedIds);
			const timer = setTimeout(() => {
				setFlashingRows(new Set());
			}, 600);
			prevAssetsRef.current = assets;
			return () => clearTimeout(timer);
		}
		prevAssetsRef.current = assets;
	}, [assets]);

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("vi-VN", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	};

	return (
		<div className="bg-background rounded-xl border border-border overflow-hidden">
			<div className="px-6 py-4 border-b border-border">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold text-foreground">
						Assets{" "}
						<span className="text-muted-foreground text-base">
							₫<AnimatedNumber
								value={assets.reduce((sum, a) => sum + a.total, 0)}
								duration={600}
								formatOptions={{
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								}}
							/>
						</span>
					</h2>
					<Button variant="ghost" size="sm" className="text-sm">
						See More Assets
					</Button>
				</div>
			</div>

			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent border-b border-border">
						<TableHead className="font-semibold text-muted-foreground">Name</TableHead>
						<TableHead className="text-right font-semibold text-muted-foreground">Amount</TableHead>
						<TableHead className="text-right font-semibold text-muted-foreground">24h Change</TableHead>
						<TableHead className="text-right font-semibold text-muted-foreground">Price</TableHead>
						<TableHead className="text-right font-semibold text-muted-foreground">Total</TableHead>
						<TableHead className="text-right font-semibold text-muted-foreground">Avg Buy<br /><span className="text-xs">All Time</span></TableHead>
						<TableHead className="text-right font-semibold text-muted-foreground">P/L<br /><span className="text-xs">All Time</span></TableHead>
						<TableHead className="w-10"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{assets.map((asset) => (
						<TableRow
							key={asset.id}
							className={`border-b border-border/50 hover:bg-muted/30 transition-colors duration-300 ${
								flashingRows.has(asset.id) ? "bg-primary/10" : ""
							}`}
						>
							<TableCell>
								<div className="flex items-center gap-3">
									<div
										className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
										style={{ backgroundColor: asset.iconColor }}
									>
										{asset.symbol.charAt(0)}
									</div>
									<div>
										<p className="font-semibold text-foreground">{asset.name}</p>
										<p className="text-sm text-muted-foreground">{asset.symbol}</p>
									</div>
								</div>
							</TableCell>
							<TableCell className="text-right font-medium text-foreground">{asset.amount.toLocaleString()}</TableCell>
							<TableCell className="text-right">
								<div className={`inline-flex items-center gap-1 ${asset.change24h >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
									{asset.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
									<span className="font-semibold">{Math.abs(asset.change24h).toFixed(2)}%</span>
								</div>
							</TableCell>
							<TableCell className="text-right text-foreground">
								₫<AnimatedNumber
									value={asset.price}
									duration={600}
									formatOptions={{
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}}
								/>
							</TableCell>
							<TableCell className="text-right font-semibold text-foreground">
								₫<AnimatedNumber
									value={asset.total}
									duration={600}
									formatOptions={{
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}}
								/>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">₫{formatCurrency(asset.avgBuy)}</TableCell>
							<TableCell className="text-right">
								<div>
									<p className={`font-semibold ${asset.profitLoss >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
										{asset.profitLoss >= 0 ? "+" : "-"}₫<AnimatedNumber
											value={Math.abs(asset.profitLoss)}
											duration={600}
											formatOptions={{
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											}}
										/>
									</p>
									<p className={`text-sm ${asset.profitLossPercent >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
										{asset.profitLossPercent >= 0 ? "▲" : "▼"} <AnimatedNumber
											value={Math.abs(asset.profitLossPercent)}
											duration={600}
											formatOptions={{
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											}}
										/>%
									</p>
								</div>
							</TableCell>
							<TableCell>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<MoreVertical className="h-4 w-4 text-muted-foreground" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										<DropdownMenuItem onClick={() => {
											setSelectedAssetSymbol(asset.symbol);
											setIsAddDialogOpen(true);
										}}>
											<Plus className="h-4 w-4 mr-2" />
											Add Transaction
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => router.push(`/transaction?filter=${asset.symbol}`)}>
											<List className="h-4 w-4 mr-2" />
											Transactions
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<AddTransactionDialog
				open={isAddDialogOpen}
				onOpenChange={setIsAddDialogOpen}
				preselectedSymbol={selectedAssetSymbol}
				onSuccess={onTransactionAdded}
			/>
		</div>
	);
}
