"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { getDefaultTransactionDate } from "@/utils/date";
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
import {
	Card,
	CardContent,
} from "@/components/ui/card";
import { CryptoSelect } from "@/components/crypto-select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AddTransactionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	preselectedSymbol?: string;
	onSuccess?: () => void;
}

export function AddTransactionDialog({
	open,
	onOpenChange,
	preselectedSymbol,
	onSuccess
}: AddTransactionDialogProps) {
	// Get dashboard data for USDT balance
	const { data: dashboardData } = api.crypto.getDashboardData.useQuery();

	const addTransactionMutation = api.crypto.addTransaction.useMutation({
		onSuccess: () => {
			const wasUsdtPayment = transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && transactionForm.symbol !== "USDT";
			if (wasUsdtPayment) {
				const amount = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.pricePerUnit);
				toast.success(`✅ Bought ${transactionForm.quantity} ${transactionForm.symbol} using ${amount.toFixed(2)} USDT`);
			} else {
				toast.success("Transaction added successfully!");
			}
			onOpenChange(false);
			// Reset form
			setTransactionForm({
				symbol: preselectedSymbol || "",
				name: "",
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
			onSuccess?.();
		},
		onError: (error: any) => {
			toast.error("Failed to add transaction: " + error.message);
		},
	});

	const [transactionForm, setTransactionForm] = useState({
		symbol: preselectedSymbol || "",
		name: "",
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

	// Initialize date on client side
	useEffect(() => {
		setTransactionForm(prev => ({
			...prev,
			transactionDate: getDefaultTransactionDate()
		}));
	}, []);

	// Update symbol when preselectedSymbol changes
	useEffect(() => {
		if (preselectedSymbol) {
			setTransactionForm(prev => ({
				...prev,
				symbol: preselectedSymbol
			}));
		}
	}, [preselectedSymbol]);

	const handleAddTransaction = async () => {
		if (!transactionForm.symbol || !transactionForm.quantity || !transactionForm.pricePerUnit || !transactionForm.type) {
			toast.error("Please fill in all required fields");
			return;
		}

		// Auto-generate name if not provided
		const cryptoName = transactionForm.name || transactionForm.symbol;

		// Check USDT balance if using USDT payment
		if (transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && transactionForm.symbol !== "USDT") {
			const usdtBalance = dashboardData?.portfolio?.usdtBalance || 0;
			const totalCost = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.pricePerUnit) + (parseFloat(transactionForm.fee) || 0);
			if (totalCost > usdtBalance) {
				toast.error(`Insufficient USDT balance. You have ${usdtBalance.toFixed(2)} USDT but need ${totalCost.toFixed(2)} USDT`);
				return;
			}
		}

		await addTransactionMutation.mutateAsync({
			symbol: transactionForm.symbol,
			name: cryptoName,
			type: transactionForm.type,
			quantity: parseFloat(transactionForm.quantity),
			pricePerUnit: parseFloat(transactionForm.pricePerUnit),
			fee: parseFloat(transactionForm.fee) || 0,
			feeCurrency: transactionForm.feeCurrency,
			paymentSource: transactionForm.paymentSource,
			exchange: transactionForm.exchange || undefined,
			notes: transactionForm.notes || undefined,
			transactionDate: transactionForm.transactionDate || getDefaultTransactionDate(),
		});
	};

	// Calculate total amount
	const totalAmount = transactionForm.quantity && transactionForm.pricePerUnit
		? parseFloat(transactionForm.quantity) * parseFloat(transactionForm.pricePerUnit)
		: 0;

	const totalCost = totalAmount + (parseFloat(transactionForm.fee) || 0);

	// Get USDT balance from portfolio
	const usdtBalance = dashboardData?.portfolio?.usdtBalance || 0;
	const remainingUsdtBalance = transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && transactionForm.symbol !== "USDT"
		? Math.max(0, usdtBalance - totalCost)
		: usdtBalance;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add New Transaction</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="symbol">Crypto Symbol</Label>
							{preselectedSymbol ? (
								<Input
									id="symbol"
									value={transactionForm.symbol}
									onChange={(e) =>
										setTransactionForm({ ...transactionForm, symbol: e.target.value.toUpperCase() })
									}
									placeholder="e.g. BTC, ETH, ASTER"
								/>
							) : (
								<CryptoSelect
									value={transactionForm.symbol}
									onValueChange={(value, name) => {
										setTransactionForm({
											...transactionForm,
											symbol: value,
											name: name || "",
										});
									}}
								/>
							)}
						</div>
						<div>
							<Label htmlFor="name">Crypto Name</Label>
							<Input
								id="name"
								value={transactionForm.name}
								onChange={(e) =>
									setTransactionForm({ ...transactionForm, name: e.target.value })
								}
								placeholder="e.g. Bitcoin, Ethereum"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="type">Type</Label>
							<Select
								value={transactionForm.type}
								onValueChange={(value) =>
									setTransactionForm({ ...transactionForm, type: value as "buy" | "sell" })
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
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="quantity">Quantity</Label>
							<Input
								id="quantity"
								type="number"
								step="any"
								value={transactionForm.quantity}
								onChange={(e) =>
									setTransactionForm({ ...transactionForm, quantity: e.target.value })
								}
							/>
						</div>
						<div>
							<Label htmlFor="pricePerUnit">Price Per Unit (USD)</Label>
							<Input
								id="pricePerUnit"
								type="number"
								step="any"
								value={transactionForm.pricePerUnit}
								onChange={(e) =>
									setTransactionForm({ ...transactionForm, pricePerUnit: e.target.value })
								}
							/>
						</div>
					</div>

					{transactionForm.type === "buy" && (
						<div>
							<Label htmlFor="paymentSource">Payment Source</Label>
							<Select
								value={transactionForm.paymentSource}
								onValueChange={(value) =>
									setTransactionForm({ ...transactionForm, paymentSource: value as "CASH" | "USDT" })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="CASH">Cash (USD)</SelectItem>
									<SelectItem value="USDT">
										USDT (Balance: {usdtBalance.toFixed(2)} USDT)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="fee">Fee (Optional)</Label>
							<Input
								id="fee"
								type="number"
								step="any"
								value={transactionForm.fee}
								onChange={(e) =>
									setTransactionForm({ ...transactionForm, fee: e.target.value })
								}
							/>
						</div>
						<div>
							<Label htmlFor="feeCurrency">Fee Currency</Label>
							<Select
								value={transactionForm.feeCurrency}
								onValueChange={(value) =>
									setTransactionForm({ ...transactionForm, feeCurrency: value as "USD" | "CRYPTO" })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="USD">USD</SelectItem>
									<SelectItem value="CRYPTO">CRYPTO</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="exchange">Exchange (Optional)</Label>
							<Input
								id="exchange"
								value={transactionForm.exchange}
								onChange={(e) =>
									setTransactionForm({ ...transactionForm, exchange: e.target.value })
								}
							/>
						</div>
						<div>
							<Label htmlFor="transactionDate">Transaction Date</Label>
							<Input
								id="transactionDate"
								type="datetime-local"
								value={transactionForm.transactionDate}
								onChange={(e) =>
									setTransactionForm({ ...transactionForm, transactionDate: e.target.value })
								}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="notes">Notes (Optional)</Label>
						<Input
							id="notes"
							value={transactionForm.notes}
							placeholder="Add any additional notes..."
							onChange={(e) =>
								setTransactionForm({ ...transactionForm, notes: e.target.value })
							}
						/>
					</div>

					{totalAmount > 0 && (
						<Card>
							<CardContent className="pt-6 space-y-2">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Total Amount:</span>
									<span className="font-medium">${totalAmount.toFixed(2)}</span>
								</div>
								{parseFloat(transactionForm.fee) > 0 && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Fee:</span>
										<span className="font-medium">
											{transactionForm.feeCurrency === "USD" ? "$" : ""}
											{transactionForm.fee}
											{transactionForm.feeCurrency === "CRYPTO" ? ` ${transactionForm.symbol}` : ""}
										</span>
									</div>
								)}
								<div className="flex justify-between font-semibold">
									<span>Total Cost:</span>
									<span>${totalCost.toFixed(2)}</span>
								</div>
								{transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && transactionForm.symbol !== "USDT" && (
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Remaining USDT:</span>
										<span className={remainingUsdtBalance < 0 ? "text-red-500" : ""}>
											{remainingUsdtBalance.toFixed(2)} USDT
										</span>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					<div className="flex gap-2 justify-end">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={handleAddTransaction} disabled={addTransactionMutation.isPending}>
							{addTransactionMutation.isPending ? "Adding..." : "Add Transaction"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
