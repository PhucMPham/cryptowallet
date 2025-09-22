"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";
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

	// Mutations
	const addTransactionMutation = api.crypto.addTransaction.useMutation({
		onSuccess: () => {
			toast.success("Transaction added successfully!");
			setIsAddingTransaction(false);
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
		exchange: "",
		notes: "",
		transactionDate: new Date().toISOString().split("T")[0],
	});

	const handleAddTransaction = async () => {
		if (!transactionForm.quantity || !transactionForm.pricePerUnit) {
			toast.error("Please fill in required fields");
			return;
		}

		await addTransactionMutation.mutate({
			assetId,
			symbol: data?.asset.symbol || "",
			name: data?.asset.name,
			type: transactionForm.type,
			quantity: parseFloat(transactionForm.quantity),
			pricePerUnit: parseFloat(transactionForm.pricePerUnit),
			fee: transactionForm.fee ? parseFloat(transactionForm.fee) : undefined,
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
					<h1 className="text-3xl font-bold">
						{data.asset.name} ({data.asset.symbol})
					</h1>
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
						<DollarSign className="h-4 w-4 text-muted-foreground" />
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
						<div className="text-2xl font-bold">
							{formatCurrency(data.summary.avgBuyPrice)}
						</div>
						<p className="text-xs text-muted-foreground">DCA price per token</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Invested</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatCurrency(data.summary.totalInvested)}
						</div>
						<p className="text-xs text-muted-foreground">Including fees</p>
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
							{formatCurrency(data.summary.realizedPL)}
						</div>
						<p className="text-xs text-muted-foreground">From sold positions</p>
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
							<span className="font-medium">
								{formatCurrency(data.summary.totalInvested)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Total Revenue</span>
							<span className="font-medium">
								{formatCurrency(data.summary.totalRevenue)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Net Invested</span>
							<span className="font-medium">
								{formatCurrency(data.summary.totalInvested - data.summary.totalRevenue)}
							</span>
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
								<TableHead className="text-right">Price/Unit</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead className="text-right">Fee</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.transactions.map((tx) => (
								<TableRow key={tx.id}>
									<TableCell>{formatDate(tx.transactionDate)}</TableCell>
									<TableCell>
										<Badge variant={tx.type === "buy" ? "default" : "secondary"}>
											{tx.type.toUpperCase()}
										</Badge>
									</TableCell>
									<TableCell>{tx.exchange || "-"}</TableCell>
									<TableCell className="text-right">
										{formatNumber(tx.quantity)}
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(tx.pricePerUnit)}
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(tx.totalAmount)}
									</TableCell>
									<TableCell className="text-right">
										{tx.fee ? formatCurrency(tx.fee) : "-"}
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
														fee: tx.fee?.toString() || "",
														transactionDate: new Date(tx.transactionDate)
															.toISOString()
															.split("T")[0],
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
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="edit-fee">Fee ($)</Label>
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