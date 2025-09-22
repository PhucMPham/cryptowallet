"use client";

import { useState } from "react";
import { api } from "@/utils/api";
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
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function CryptoTracker() {
	const [isAddingTransaction, setIsAddingTransaction] = useState(false);
	const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

	// Fetch data
	const { data: assets, refetch: refetchAssets } = api.crypto.getAssets.useQuery();
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
		exchange: "",
		notes: "",
		transactionDate: new Date().toISOString().split("T")[0],
	});

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
				<h1 className="text-3xl font-bold">Crypto Portfolio Tracker</h1>
				<Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
					<DialogTrigger asChild>
						<Button>
							<PlusCircle className="mr-2 h-4 w-4" />
							Add Transaction
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[500px]">
						<DialogHeader>
							<DialogTitle>Add New Transaction</DialogTitle>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="symbol">Symbol *</Label>
									<Input
										id="symbol"
										placeholder="BTC"
										value={transactionForm.symbol}
										onChange={(e) =>
											setTransactionForm({
												...transactionForm,
												symbol: e.target.value.toUpperCase(),
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										placeholder="Bitcoin"
										value={transactionForm.name}
										onChange={(e) =>
											setTransactionForm({
												...transactionForm,
												name: e.target.value,
											})
										}
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
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="fee">Fee ($)</Label>
									<Input
										id="fee"
										type="number"
										step="any"
										placeholder="10"
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
						<div className="text-2xl font-bold">
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
						<div className="text-2xl font-bold">
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
						<div className="text-2xl font-bold">
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
								<TableHead className="text-right">Total Invested</TableHead>
								<TableHead className="text-right">Total Sold</TableHead>
								<TableHead className="text-right">Transactions</TableHead>
								<TableHead></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{assets && assets.length > 0 ? (
								assets.map((item) => (
									<TableRow key={item.asset.id}>
										<TableCell className="font-medium">
											{item.asset.symbol}
										</TableCell>
										<TableCell>{item.asset.name}</TableCell>
										<TableCell className="text-right">
											{formatNumber(item.totalQuantity)}
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(item.avgBuyPrice)}
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(item.totalInvested)}
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(item.totalSold)}
										</TableCell>
										<TableCell className="text-right">
											{item.transactionCount}
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
								))
							) : (
								<TableRow>
									<TableCell colSpan={8} className="text-center text-muted-foreground">
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