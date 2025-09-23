"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { api } from "@/utils/api";
import { getDefaultTransactionDate } from "@/utils/date";
import { formatVnd } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
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
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { CryptoAssetsTable } from "@/components/crypto-assets-table";
import { formatCurrency } from "@/utils/formatters";

// Loading skeleton
const LoadingSkeleton = () => (
	<div className="space-y-6">
		<div className="h-8 w-48 bg-muted animate-pulse rounded" />
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{[...Array(4)].map((_, i) => (
				<div key={i} className="h-32 bg-muted animate-pulse rounded" />
			))}
		</div>
		<div className="h-96 bg-muted animate-pulse rounded" />
	</div>
);

export default function CryptoTracker() {
	const [isAddingTransaction, setIsAddingTransaction] = useState(false);

	// Use the optimized combined endpoint
	const { data: dashboardData, refetch: refetchDashboard, isLoading } = api.crypto.getDashboardData.useQuery(undefined, {
		refetchInterval: 60000, // Refresh every minute instead of 30 seconds
		staleTime: 30000, // Consider data stale after 30 seconds
		gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
	});

	// Mutations
	const addTransactionMutation = api.crypto.addTransaction.useMutation({
		onSuccess: () => {
			toast.success("Transaction added successfully!");
			setIsAddingTransaction(false);
			refetchDashboard();
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

	const handleViewDetails = (assetId: number) => {
		window.location.href = `/crypto/${assetId}`;
	};

	// Show loading skeleton while data is being fetched
	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<LoadingSkeleton />
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold">Crypto Portfolio Tracker</h1>
					{dashboardData?.vndRate && (
						<p className="text-sm text-muted-foreground mt-1">
							Exchange Rate: 1 USD = {formatVnd(dashboardData.vndRate.usdToVnd)}
							{dashboardData.vndRate.source === "P2P Market" && (
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
												(transactionForm.fee && transactionForm.feeCurrency === "USD"
													? parseFloat(transactionForm.fee)
													: transactionForm.fee && transactionForm.feeCurrency === "CRYPTO"
													? parseFloat(transactionForm.fee) * parseFloat(transactionForm.pricePerUnit)
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

			{/* Portfolio Summary with Suspense */}
			<Suspense fallback={<LoadingSkeleton />}>
				<PortfolioSummary
					portfolio={dashboardData?.portfolio}
					isLoading={isLoading}
				/>
			</Suspense>

			{/* Assets Table with Virtual Scrolling */}
			<Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
				<CryptoAssetsTable
					assets={dashboardData?.assets || []}
					onViewDetails={handleViewDetails}
				/>
			</Suspense>
		</div>
	);
}