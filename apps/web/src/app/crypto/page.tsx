"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { getDefaultTransactionDate } from "@/utils/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CryptoSelect } from "@/components/crypto-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

export default function CryptoTracker() {
	const [isAddingTransaction, setIsAddingTransaction] = useState(false);
	const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

	// Fetch data
	const { data: assets, refetch: refetchAssets } = api.crypto.getAssetsWithPrices.useQuery(undefined, {
		refetchInterval: 30000, // Refresh prices every 30 seconds
	});
	const { data: portfolio } = api.crypto.getPortfolioSummary.useQuery();

	// Mutations
	const addTransactionMutation = api.crypto.addTransaction.useMutation({
		onSuccess: () => {
			toast.success("Transaction added successfully!");
			setIsAddingTransaction(false);
			refetchAssets();
		},
		onError: (error) => {
			toast.error("Failed to add transaction: " + error.message);
		},
	});

	const [transactionForm, setTransactionForm] = useState({
		symbol: "",
		name: "",
		type: "buy" as "buy" | "sell",
		quantity: "",
		pricePerUnit: "",
		fee: "",
		feeCurrency: "USD" as "USD" | "CRYPTO",
		exchange: "",
		notes: "",
		transactionDate: "",
	});

	// Initialize date on client side to avoid hydration mismatch
	useEffect(() => {
		setTransactionForm(prev => ({
			...prev,
			transactionDate: getDefaultTransactionDate()
		}));
	}, []);

	const handleAddTransaction = async () => {
		if (!transactionForm.symbol || !transactionForm.quantity || !transactionForm.pricePerUnit) {
			toast.error("Please fill in required fields");
			return;
		}

		await addTransactionMutation.mutate({
			symbol: transactionForm.symbol,
			name: transactionForm.name || transactionForm.symbol,
			type: transactionForm.type,
			quantity: parseFloat(transactionForm.quantity),
			pricePerUnit: parseFloat(transactionForm.pricePerUnit),
			fee: transactionForm.fee ? parseFloat(transactionForm.fee) : undefined,
			feeCurrency: transactionForm.feeCurrency,
			exchange: transactionForm.exchange || undefined,
			notes: transactionForm.notes || undefined,
			transactionDate: transactionForm.transactionDate,
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	const formatVnd = (amount: number) => {
		return new Intl.NumberFormat("vi-VN", {
			style: "currency",
			currency: "VND",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const formatNumber = (amount: number, decimals: number = 6) => {
		return new Intl.NumberFormat("en-US", {
			minimumFractionDigits: 0,
			maximumFractionDigits: decimals,
		}).format(amount);
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold">Crypto Portfolio Tracker</h1>
					{assets && assets[0]?.vnd && (
						<p className="text-sm text-muted-foreground mt-1">
							Exchange Rate: 1 USD = {formatVnd(assets[0].vnd.exchangeRate)}
							{assets[0].vnd.source === "P2P Market" && (
								<span className="ml-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
									P2P Rate
								</span>
							)}
						</p>
					)}
				</div>
				<Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
					<DialogTrigger asChild>
						<Button>
							<PlusCircle className="mr-2 h-4 w-4" />
							Add Transaction
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[600px]">
						<DialogHeader>
							<DialogTitle>Add New Transaction</DialogTitle>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="symbol">Symbol *</Label>
									<CryptoSelect
										value={transactionForm.symbol}
										onValueChange={(symbol, name) =>
											setTransactionForm({
												...transactionForm,
												symbol,
												name,
											})
										}
										placeholder="Select cryptocurrency"
									/>
								</div>
								<div>
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										placeholder="Auto-populated"
										value={transactionForm.name}
										disabled
										className="bg-muted"
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="type">Type</Label>
								<Select
									value={transactionForm.type}
									onValueChange={(value) =>
										setTransactionForm({
											...transactionForm,
											type: value as "buy" | "sell",
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="buy">Buy</SelectItem>
										<SelectItem value="sell">Sell</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="quantity">Quantity *</Label>
									<Input
										id="quantity"
										type="number"
										step="any"
										placeholder="0.5"
										value={transactionForm.quantity}
										onChange={(e) =>
											setTransactionForm({
												...transactionForm,
												quantity: e.target.value,
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="pricePerUnit">Price per Unit ($) *</Label>
									<Input
										id="pricePerUnit"
										type="number"
										step="any"
										placeholder="50000"
										value={transactionForm.pricePerUnit}
										onChange={(e) =>
											setTransactionForm({
												...transactionForm,
												pricePerUnit: e.target.value,
											})
										}
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="feeCurrency">Fee Currency</Label>
								<Select
									value={transactionForm.feeCurrency}
									onValueChange={(value) =>
										setTransactionForm({
											...transactionForm,
											feeCurrency: value as "USD" | "CRYPTO",
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="USD">USD</SelectItem>
										<SelectItem value="CRYPTO">
											{transactionForm.symbol || "Crypto"}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="fee">
										Fee {transactionForm.feeCurrency === "USD" ? "($)" : `(${transactionForm.symbol || "Crypto"})`}
										{transactionForm.fee && transactionForm.feeCurrency === "CRYPTO" && transactionForm.pricePerUnit && (
											<span className="text-xs text-muted-foreground ml-1">
												≈ ${(parseFloat(transactionForm.fee) * parseFloat(transactionForm.pricePerUnit)).toFixed(2)}
											</span>
										)}
									</Label>
									<Input
										id="fee"
										type="number"
										step="any"
										placeholder={transactionForm.feeCurrency === "USD" ? "10" : "0.0001"}
										value={transactionForm.fee}
										onChange={(e) =>
											setTransactionForm({
												...transactionForm,
												fee: e.target.value,
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="exchange">Exchange</Label>
									<Input
										id="exchange"
										placeholder="Binance"
										value={transactionForm.exchange}
										onChange={(e) =>
											setTransactionForm({
												...transactionForm,
												exchange: e.target.value,
											})
										}
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="date">Transaction Date</Label>
								<Input
									id="date"
									type="date"
									value={transactionForm.transactionDate}
									onChange={(e) =>
										setTransactionForm({
											...transactionForm,
											transactionDate: e.target.value,
										})
									}
								/>
							</div>
							<div>
								<Label htmlFor="notes">Notes</Label>
								<Input
									id="notes"
									placeholder="Optional notes"
									value={transactionForm.notes}
									onChange={(e) =>
										setTransactionForm({
											...transactionForm,
											notes: e.target.value,
										})
									}
								/>
							</div>
							{transactionForm.quantity && transactionForm.pricePerUnit && (
								<div className="bg-muted p-3 rounded-md">
									<p className="text-sm text-muted-foreground">Total Amount:</p>
									<p className="text-lg font-semibold">
										{formatCurrency(
											parseFloat(transactionForm.quantity) *
												parseFloat(transactionForm.pricePerUnit) +
												(transactionForm.fee
													? parseFloat(transactionForm.fee)
													: 0)
										)}
									</p>
								</div>
							)}
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setIsAddingTransaction(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleAddTransaction}
								disabled={addTransactionMutation.isPending}
							>
								{addTransactionMutation.isPending ? "Adding..." : "Add Transaction"}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Portfolio Summary */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Invested</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{formatVnd(portfolio?.vnd?.totalInvested || 0)}
						</div>
						<div className="text-sm text-muted-foreground">
							{formatCurrency(portfolio?.totalInvested || 0)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Sold</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{formatVnd(portfolio?.vnd?.totalSold || 0)}
						</div>
						<div className="text-sm text-muted-foreground">
							{formatCurrency(portfolio?.totalSold || 0)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Net Invested</CardTitle>
						<Wallet className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{formatVnd(portfolio?.vnd?.netInvested || 0)}
						</div>
						<div className="text-sm text-muted-foreground">
							{formatCurrency(
								(portfolio?.totalInvested || 0) - (portfolio?.totalSold || 0)
							)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Assets</CardTitle>
						<TrendingDown className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{portfolio?.assetCount || 0}</div>
					</CardContent>
				</Card>
			</div>

			{/* Assets Table */}
			<Card>
				<CardHeader>
					<CardTitle>Your Crypto Assets</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Symbol</TableHead>
								<TableHead>Name</TableHead>
								<TableHead className="text-right">Holdings</TableHead>
								<TableHead className="text-right">Avg Buy Price</TableHead>
								<TableHead className="text-right">Current Price</TableHead>
								<TableHead className="text-right">Current Value</TableHead>
								<TableHead className="text-right">Profit/Loss</TableHead>
								<TableHead className="text-right">P&L %</TableHead>
								<TableHead></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{assets && assets.length > 0 ? (
								assets.map((item) => {
									const isProfitable = item.unrealizedPL > 0;
									const hasHoldings = item.totalQuantity > 0;
									return (
										<TableRow key={item.asset.id}>
											<TableCell className="font-medium">
												<div className="flex items-center gap-2">
													{item.logoUrl ? (
														<img
															src={item.logoUrl}
															alt={item.asset.symbol}
															className="w-6 h-6 rounded-full"
															onError={(e) => {
																e.currentTarget.style.display = 'none';
															}}
														/>
													) : (
														<div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
															{item.asset.symbol.slice(0, 2)}
														</div>
													)}
													<span>{item.asset.symbol}</span>
												</div>
											</TableCell>
											<TableCell>{item.asset.name}</TableCell>
											<TableCell className="text-right">
												{formatNumber(item.totalQuantity)}
											</TableCell>
											<TableCell className="text-right">
												<div className="font-medium">
													{formatVnd(item.vnd?.avgBuyPrice || 0)}
												</div>
												<div className="text-xs text-muted-foreground">
													{formatCurrency(item.avgBuyPrice)}
												</div>
											</TableCell>
											<TableCell className="text-right">
												{item.currentPrice ? (
													<div className="flex items-center justify-end gap-2">
														{item.logoUrl && (
															<img
																src={item.logoUrl}
																alt={item.asset.symbol}
																className="w-4 h-4 rounded-full"
																onError={(e) => {
																	e.currentTarget.style.display = 'none';
																}}
															/>
														)}
														<div>
															<div className="font-medium">
																{formatVnd(item.vnd?.currentPrice || 0)}
															</div>
															<div className="text-xs text-muted-foreground">
																{formatCurrency(item.currentPrice)}
															</div>
														</div>
													</div>
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												{hasHoldings && item.currentValue > 0 ? (
													<div>
														<div className="font-semibold">
															{formatVnd(item.vnd?.currentValue || 0)}
														</div>
														<div className="text-xs text-muted-foreground">
															{formatCurrency(item.currentValue)}
														</div>
													</div>
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												{hasHoldings && item.currentPrice ? (
													<div
														className={`${
															isProfitable ? "text-green-600" : "text-red-600"
														}`}
													>
														<div className="flex items-center justify-end gap-1">
															{isProfitable ? (
																<ArrowUp className="h-3 w-3" />
															) : (
																<ArrowDown className="h-3 w-3" />
															)}
															<div>
																<div className="font-medium">
																	{formatVnd(Math.abs(item.vnd?.unrealizedPL || 0))}
																</div>
																<div className="text-xs">
																	{formatCurrency(Math.abs(item.unrealizedPL))}
																</div>
															</div>
														</div>
													</div>
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												{hasHoldings && item.currentPrice ? (
													<span
														className={`font-medium ${
															isProfitable ? "text-green-600" : "text-red-600"
														}`}
													>
														{item.unrealizedPLPercent >= 0 ? "+" : ""}
														{item.unrealizedPLPercent.toFixed(2)}%
													</span>
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														(window.location.href = `/crypto/${item.asset.id}`)
													}
												>
													View Details
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							) : (
								<TableRow>
									<TableCell colSpan={9} className="text-center text-muted-foreground">
										No assets found. Add your first transaction to get started.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}