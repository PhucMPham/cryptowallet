"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { getDefaultTransactionDate, formatDateForInput } from "@/utils/date";
import { formatCurrency, formatVnd, formatNumber, formatPercent, formatCrypto } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowLeft,
	PlusCircle,
	TrendingUp,
	TrendingDown,
	DollarSign,
	Percent,
	Calendar,
	Trash2,
	Edit,
} from "lucide-react";
import { toast } from "sonner";

export default function AssetDetails() {
	const params = useParams();
	const router = useRouter();
	const assetId = parseInt(params.id as string);

	const [isAddingTransaction, setIsAddingTransaction] = useState(false);
	const [editingTransaction, setEditingTransaction] = useState<any>(null);

	// Fetch asset details
	const { data, refetch } = api.crypto.getAssetDetails.useQuery(
		{ assetId },
		{ enabled: !!assetId }
	);

	// Get USDT balance for payment source
	const { data: dashboardData } = api.crypto.getDashboardData.useQuery();
	const usdtAsset = dashboardData?.assets.find(a => a.asset.symbol === "USDT");
	const usdtBalance = usdtAsset?.totalQuantity || 0;

	// Mutations
	const addTransactionMutation = api.crypto.addTransaction.useMutation({
		onSuccess: () => {
			const wasUsdtPayment = transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && data?.asset.symbol !== "USDT";
			if (wasUsdtPayment) {
				const amount = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.pricePerUnit);
				toast.success(`✅ Bought ${transactionForm.quantity} ${data?.asset.symbol} using ${amount.toFixed(2)} USDT!`);
			} else {
				toast.success("Transaction added successfully!");
			}
			setIsAddingTransaction(false);
			// Reset form
			setTransactionForm({
				type: "buy",
				quantity: "",
				pricePerUnit: "",
				fee: "",
				feeCurrency: "USD",
				paymentSource: "CASH",
				exchange: "",
				notes: "",
				transactionDate: getDefaultTransactionDate(),
			});
			refetch();
		},
	});

	const updateTransactionMutation = api.crypto.updateTransaction.useMutation({
		onSuccess: () => {
			toast.success("Transaction updated successfully!");
			setEditingTransaction(null);
			refetch();
		},
	});

	const deleteTransactionMutation = api.crypto.deleteTransaction.useMutation({
		onSuccess: () => {
			toast.success("Transaction deleted successfully!");
			refetch();
		},
	});

	const [transactionForm, setTransactionForm] = useState({
		type: "buy" as "buy" | "sell",
		quantity: "",
		pricePerUnit: "",
		fee: "",
		feeCurrency: "USD" as "USD" | "CRYPTO",
		paymentSource: "CASH" as "CASH" | "USDT",
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
		if (!transactionForm.quantity || !transactionForm.pricePerUnit) {
			toast.error("Please fill in required fields");
			return;
		}

		// Check if user has enough USDT when buying with USDT
		if (transactionForm.type === "buy" && transactionForm.paymentSource === "USDT" && data?.asset.symbol !== "USDT") {
			const totalCost = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.pricePerUnit) + (transactionForm.fee ? parseFloat(transactionForm.fee) : 0);
			if (totalCost > usdtBalance) {
				toast.error(`Insufficient USDT balance. You have ${usdtBalance.toFixed(2)} USDT but need ${totalCost.toFixed(2)} USDT`);
				return;
			}
		}

		await addTransactionMutation.mutate({
			assetId,
			symbol: data?.asset.symbol || "",
			name: data?.asset.name,
			type: transactionForm.type,
			quantity: parseFloat(transactionForm.quantity),
			pricePerUnit: parseFloat(transactionForm.pricePerUnit),
			fee: transactionForm.fee ? parseFloat(transactionForm.fee) : undefined,
			feeCurrency: transactionForm.feeCurrency,
			paymentSource: transactionForm.paymentSource,
			exchange: transactionForm.exchange || undefined,
			notes: transactionForm.notes || undefined,
			transactionDate: transactionForm.transactionDate,
		});
	};

	const handleUpdateTransaction = async () => {
		if (!editingTransaction) return;

		await updateTransactionMutation.mutate({
			id: editingTransaction.id,
			type: editingTransaction.type,
			quantity: parseFloat(editingTransaction.quantity),
			pricePerUnit: parseFloat(editingTransaction.pricePerUnit),
			fee: editingTransaction.fee ? parseFloat(editingTransaction.fee) : undefined,
			exchange: editingTransaction.exchange || undefined,
			notes: editingTransaction.notes || undefined,
			transactionDate: editingTransaction.transactionDate,
		});
	};

	// Formatters are now imported from utils/formatters.ts

	const formatDate = (date: any) => {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	if (!data) {
		return <div>Loading...</div>;
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => router.push("/crypto")}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						{data.asset.logoUrl ? (
							<img
								src={data.asset.logoUrl}
								alt={data.asset.symbol}
								className="w-10 h-10 rounded-full"
								onError={(e) => {
									e.currentTarget.style.display = 'none';
								}}
							/>
						) : (
							<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
								{data.asset.symbol.slice(0, 2)}
							</div>
						)}
						<h1 className="text-3xl font-bold">
							{data.asset.name} ({data.asset.symbol})
						</h1>
					</div>
					{data.summary.vnd && (
						<p className="text-sm text-muted-foreground mt-2 ml-13">
							Exchange Rate: 1 USD = {formatVnd(data.summary.vnd.exchangeRate)}
							{data.summary.vnd.source === "P2P Market" && (
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
					<DialogContent className="sm:max-w-[500px]">
						<DialogHeader>
							<DialogTitle>
								Add {data.asset.symbol} Transaction
							</DialogTitle>
						</DialogHeader>
						<div className="grid gap-4 py-4">
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
							{/* Payment Source selector - only show for Buy transactions and non-USDT */}
							{transactionForm.type === "buy" && data.asset.symbol !== "USDT" && (
								<div>
									<Label htmlFor="paymentSource">Payment Source</Label>
									<Select
										value={transactionForm.paymentSource}
										onValueChange={(value) =>
											setTransactionForm({
												...transactionForm,
												paymentSource: value as "CASH" | "USDT",
											})
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="CASH">Cash (USD)</SelectItem>
											<SelectItem value="USDT">
												USDT Balance ({usdtBalance.toFixed(2)} USDT)
											</SelectItem>
										</SelectContent>
									</Select>
									{transactionForm.paymentSource === "USDT" && transactionForm.quantity && transactionForm.pricePerUnit && (
										<div className="mt-2 p-2 bg-muted rounded text-sm">
											<div>Total Cost: {(parseFloat(transactionForm.quantity || "0") * parseFloat(transactionForm.pricePerUnit || "0")).toFixed(2)} USDT</div>
											<div className={`font-semibold ${(parseFloat(transactionForm.quantity || "0") * parseFloat(transactionForm.pricePerUnit || "0")) > usdtBalance ? "text-destructive" : "text-green-600"}`}>
												Remaining: {(usdtBalance - parseFloat(transactionForm.quantity || "0") * parseFloat(transactionForm.pricePerUnit || "0")).toFixed(2)} USDT
											</div>
										</div>
									)}
								</div>
							)}
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
										<SelectItem value="CRYPTO">{data.asset.symbol}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="fee">
										Fee {transactionForm.feeCurrency === "USD" ? "($)" : `(${data.asset.symbol})`}
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

			{/* DCA Summary Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Current Holdings</CardTitle>
						{data.asset.logoUrl ? (
							<img
								src={data.asset.logoUrl}
								alt={data.asset.symbol}
								className="h-4 w-4 rounded-full opacity-60"
								onError={(e) => {
									e.currentTarget.style.display = 'none';
								}}
							/>
						) : (
							<DollarSign className="h-4 w-4 text-muted-foreground" />
						)}
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatNumber(data.summary.currentHoldings)}
						</div>
						<p className="text-xs text-muted-foreground">
							{data.asset.symbol} tokens
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Average Buy Price</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{formatVnd(data.summary.vnd?.avgBuyPrice || 0)}
						</div>
						<div className="text-sm text-muted-foreground">
							{formatCurrency(data.summary.avgBuyPrice)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">DCA price per token</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Invested</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{formatVnd(data.summary.vnd?.totalInvested || 0)}
						</div>
						<div className="text-sm text-muted-foreground">
							{formatCurrency(data.summary.totalInvested)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">Including fees</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Realized P/L</CardTitle>
						<Percent className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${
								data.summary.realizedPL >= 0 ? "text-green-600" : "text-red-600"
							}`}
						>
							{formatVnd(data.summary.vnd?.realizedPL || 0)}
						</div>
						<div className="text-sm text-muted-foreground">
							{formatCurrency(data.summary.realizedPL)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">From sold positions</p>
					</CardContent>
				</Card>
			</div>

			{/* Additional Stats */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Purchase Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Total Bought</span>
							<span className="font-medium">
								{formatNumber(data.summary.totalBought)} {data.asset.symbol}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Total Sold</span>
							<span className="font-medium">
								{formatNumber(data.summary.totalSold)} {data.asset.symbol}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Net Position</span>
							<span className="font-medium">
								{formatNumber(data.summary.currentHoldings)} {data.asset.symbol}
							</span>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Financial Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Total Invested</span>
							<div className="text-right">
								<div className="font-medium">
									{formatVnd(data.summary.vnd?.totalInvested || 0)}
								</div>
								<div className="text-xs text-muted-foreground">
									{formatCurrency(data.summary.totalInvested)}
								</div>
							</div>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Total Revenue</span>
							<div className="text-right">
								<div className="font-medium">
									{formatVnd(data.summary.vnd?.totalRevenue || 0)}
								</div>
								<div className="text-xs text-muted-foreground">
									{formatCurrency(data.summary.totalRevenue)}
								</div>
							</div>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Net Invested</span>
							<div className="text-right">
								<div className="font-medium">
									{formatVnd(data.summary.vnd?.netInvested || 0)}
								</div>
								<div className="text-xs text-muted-foreground">
									{formatCurrency(data.summary.totalInvested - data.summary.totalRevenue)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Transactions Table */}
			<Card>
				<CardHeader>
					<CardTitle>Transaction History</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Exchange</TableHead>
								<TableHead className="text-right">Quantity</TableHead>
								<TableHead className="text-right">Price/Unit<br/><span className="text-xs font-normal opacity-70">VND / USD</span></TableHead>
								<TableHead className="text-right">Total<br/><span className="text-xs font-normal opacity-70">VND / USD</span></TableHead>
								<TableHead className="text-right">Fee</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.transactions.map((tx) => (
								<TableRow
									key={tx.id}
									className={tx.type === "buy"
										? "hover:bg-green-50/50 dark:hover:bg-green-950/10"
										: "hover:bg-red-50/50 dark:hover:bg-red-950/10"}
								>
									<TableCell>{formatDate(tx.transactionDate)}</TableCell>
									<TableCell>
										<Badge
											variant={tx.type === "buy" ? "default" : "destructive"}
											className={tx.type === "buy"
												? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-800"
												: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-800"}
										>
											{tx.type === "buy" ? (
												<>
													<TrendingDown className="mr-1 h-3 w-3" />
													BUY
												</>
											) : (
												<>
													<TrendingUp className="mr-1 h-3 w-3" />
													SELL
												</>
											)}
										</Badge>
									</TableCell>
									<TableCell>{tx.exchange || "-"}</TableCell>
									<TableCell className="text-right">
										<span className={tx.type === "buy"
											? "text-green-700 dark:text-green-400 font-medium"
											: "text-red-700 dark:text-red-400 font-medium"}>
											{tx.type === "buy" ? "+" : "-"}{formatNumber(tx.quantity)}
										</span>
									</TableCell>
									<TableCell className="text-right">
										<div className="font-medium">
											{formatVnd(tx.vnd?.pricePerUnit || 0)}
										</div>
										<div className="text-xs text-muted-foreground">
											{formatCurrency(tx.pricePerUnit)}
										</div>
									</TableCell>
									<TableCell className="text-right">
										<div className={`font-medium ${tx.type === "buy"
											? "text-green-700 dark:text-green-400"
											: "text-red-700 dark:text-red-400"}`}>
											{formatVnd(tx.vnd?.totalAmount || 0)}
										</div>
										<div className="text-xs text-muted-foreground">
											{formatCurrency(tx.totalAmount)}
										</div>
									</TableCell>
									<TableCell className="text-right">
										{tx.fee ? (
											<div>
												<div className="font-medium">
													{formatVnd(tx.vnd?.fee || 0)}
												</div>
												<div className="text-xs text-muted-foreground">
													{formatCurrency(tx.fee)}
												</div>
												{tx.feeCurrency === "CRYPTO" && tx.feeInCrypto && (
													<div className="text-xs text-muted-foreground">
														({formatNumber(tx.feeInCrypto)} {data.asset.symbol})
													</div>
												)}
											</div>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell className="max-w-[200px] truncate">
										{tx.notes || "-"}
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setEditingTransaction({
														...tx,
														quantity: tx.quantity.toString(),
														pricePerUnit: tx.pricePerUnit.toString(),
														fee: tx.feeCurrency === "CRYPTO" && tx.feeInCrypto
															? tx.feeInCrypto.toString()
															: tx.fee?.toString() || "",
														feeCurrency: tx.feeCurrency || "USD",
														transactionDate: formatDateForInput(tx.transactionDate),
													});
												}}
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													if (confirm("Delete this transaction?")) {
														deleteTransactionMutation.mutate({ id: tx.id });
													}
												}}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Edit Transaction Dialog */}
			<Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Edit Transaction</DialogTitle>
					</DialogHeader>
					{editingTransaction && (
						<div className="grid gap-4 py-4">
							<div>
								<Label htmlFor="edit-type">Type</Label>
								<Select
									value={editingTransaction.type}
									onValueChange={(value) =>
										setEditingTransaction({
											...editingTransaction,
											type: value,
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
									<Label htmlFor="edit-quantity">Quantity</Label>
									<Input
										id="edit-quantity"
										type="number"
										step="any"
										value={editingTransaction.quantity}
										onChange={(e) =>
											setEditingTransaction({
												...editingTransaction,
												quantity: e.target.value,
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="edit-price">Price per Unit ($)</Label>
									<Input
										id="edit-price"
										type="number"
										step="any"
										value={editingTransaction.pricePerUnit}
										onChange={(e) =>
											setEditingTransaction({
												...editingTransaction,
												pricePerUnit: e.target.value,
											})
										}
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="edit-feeCurrency">Fee Currency</Label>
								<Select
									value={editingTransaction.feeCurrency}
									onValueChange={(value) =>
										setEditingTransaction({
											...editingTransaction,
											feeCurrency: value,
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="USD">USD</SelectItem>
										<SelectItem value="CRYPTO">{data.asset.symbol}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="edit-fee">
										Fee {editingTransaction.feeCurrency === "USD" ? "($)" : `(${data.asset.symbol})`}
										{editingTransaction.fee && editingTransaction.feeCurrency === "CRYPTO" && editingTransaction.pricePerUnit && (
											<span className="text-xs text-muted-foreground ml-1">
												≈ ${(parseFloat(editingTransaction.fee) * parseFloat(editingTransaction.pricePerUnit)).toFixed(2)}
											</span>
										)}
									</Label>
									<Input
										id="edit-fee"
										type="number"
										step="any"
										value={editingTransaction.fee}
										onChange={(e) =>
											setEditingTransaction({
												...editingTransaction,
												fee: e.target.value,
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="edit-exchange">Exchange</Label>
									<Input
										id="edit-exchange"
										value={editingTransaction.exchange || ""}
										onChange={(e) =>
											setEditingTransaction({
												...editingTransaction,
												exchange: e.target.value,
											})
										}
									/>
								</div>
							</div>
							<div>
								<Label htmlFor="edit-date">Transaction Date</Label>
								<Input
									id="edit-date"
									type="date"
									value={editingTransaction.transactionDate}
									onChange={(e) =>
										setEditingTransaction({
											...editingTransaction,
											transactionDate: e.target.value,
										})
									}
								/>
							</div>
							<div>
								<Label htmlFor="edit-notes">Notes</Label>
								<Input
									id="edit-notes"
									value={editingTransaction.notes || ""}
									onChange={(e) =>
										setEditingTransaction({
											...editingTransaction,
											notes: e.target.value,
										})
									}
								/>
							</div>
						</div>
					)}
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setEditingTransaction(null)}>
							Cancel
						</Button>
						<Button
							onClick={handleUpdateTransaction}
							disabled={updateTransactionMutation.isPending}
						>
							{updateTransactionMutation.isPending ? "Updating..." : "Update"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}