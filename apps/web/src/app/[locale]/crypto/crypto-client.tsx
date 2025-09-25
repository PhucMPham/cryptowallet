"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
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
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

export default function CryptoClient() {
	const t = useTranslations('crypto');
	const router = useRouter();

	const [isAddingTransaction, setIsAddingTransaction] = useState(false);

	// Use the optimized combined endpoint
	const { data: dashboardData, refetch: refetchDashboard, isLoading } = api.crypto.getDashboardData.useQuery(undefined, {
		refetchInterval: 60000, // Refresh every minute
		staleTime: 30000, // Consider data stale after 30 seconds
		gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
	});

	// Mutations
	const addTransactionMutation = api.crypto.addTransaction.useMutation({
		onSuccess: () => {
			const wasUsdtPayment = transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && transactionForm.symbol !== "USDT";
			if (wasUsdtPayment) {
				const amount = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.pricePerUnit);
				toast.success(`✅ ${t('messages.boughtWithUsdt', { quantity: transactionForm.quantity, symbol: transactionForm.symbol, amount: amount.toFixed(2) })}`);
			} else {
				toast.success(t('messages.transactionAdded'));
			}
			setIsAddingTransaction(false);
			// Reset form
			setTransactionForm({
				symbol: "",
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
			refetchDashboard();
		},
		onError: (error) => {
			toast.error(t('messages.failedToAdd') + ": " + error.message);
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

	const handleAddTransaction = async () => {
		if (!transactionForm.symbol || !transactionForm.quantity || !transactionForm.pricePerUnit || !transactionForm.type) {
			toast.error(t('messages.fillRequired'));
			return;
		}

		// Check USDT balance if using USDT payment
		if (transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && transactionForm.symbol !== "USDT") {
			const usdtBalance = dashboardData?.portfolio?.usdtBalance || 0;
			const totalCost = parseFloat(transactionForm.quantity) * parseFloat(transactionForm.pricePerUnit) + (parseFloat(transactionForm.fee) || 0);
			if (totalCost > usdtBalance) {
				toast.error(t('messages.insufficientUsdt', {
					balance: usdtBalance.toFixed(2),
					required: totalCost.toFixed(2)
				}));
				return;
			}
		}

		await addTransactionMutation.mutateAsync({
			symbol: transactionForm.symbol,
			name: transactionForm.name || "",
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

	// Show loading skeleton
	if (isLoading) {
		return <LoadingSkeleton />;
	}

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

	// Handle navigation to asset details
	const handleViewDetails = (assetId: number) => {
		router.push(`/crypto/${assetId}`);
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
				<Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
					<DialogTrigger asChild>
						<Button>
							<PlusCircle className="h-4 w-4 mr-2" />
							{t('addTransaction')}
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>{t('addNewTransaction')}</DialogTitle>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="symbol">{t('form.symbol')}</Label>
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
								</div>
								<div>
									<Label htmlFor="type">{t('form.type')}</Label>
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
											<SelectItem value="buy">{t('form.buy')}</SelectItem>
											<SelectItem value="sell">{t('form.sell')}</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="quantity">{t('form.quantity')}</Label>
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
									<Label htmlFor="pricePerUnit">{t('form.pricePerUnit')}</Label>
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
									<Label htmlFor="paymentSource">{t('form.paymentSource')}</Label>
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
											<SelectItem value="CASH">{t('form.cash')}</SelectItem>
											<SelectItem value="USDT">
												{t('form.usdtBalance', { balance: usdtBalance.toFixed(2) })}
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="fee">{t('form.fee')}</Label>
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
									<Label htmlFor="feeCurrency">{t('form.feeCurrency')}</Label>
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
									<Label htmlFor="exchange">{t('form.exchange')}</Label>
									<Input
										id="exchange"
										value={transactionForm.exchange}
										onChange={(e) =>
											setTransactionForm({ ...transactionForm, exchange: e.target.value })
										}
									/>
								</div>
								<div>
									<Label htmlFor="transactionDate">{t('form.transactionDate')}</Label>
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
								<Label htmlFor="notes">{t('form.notes')}</Label>
								<Input
									id="notes"
									value={transactionForm.notes}
									placeholder={t('form.optionalNotes')}
									onChange={(e) =>
										setTransactionForm({ ...transactionForm, notes: e.target.value })
									}
								/>
							</div>

							{totalAmount > 0 && (
								<Card>
									<CardContent className="pt-6 space-y-2">
										<div className="flex justify-between">
											<span className="text-muted-foreground">{t('form.totalAmount')}:</span>
											<span className="font-medium">${totalAmount.toFixed(2)}</span>
										</div>
										{parseFloat(transactionForm.fee) > 0 && (
											<div className="flex justify-between">
												<span className="text-muted-foreground">{t('form.fee')}:</span>
												<span className="font-medium">
													{transactionForm.feeCurrency === "USD" ? "$" : ""}
													{transactionForm.fee}
													{transactionForm.feeCurrency === "CRYPTO" ? ` ${transactionForm.symbol}` : ""}
												</span>
											</div>
										)}
										<div className="flex justify-between font-semibold">
											<span>{t('form.totalCost')}:</span>
											<span>${totalCost.toFixed(2)}</span>
										</div>
										{transactionForm.paymentSource === "USDT" && transactionForm.type === "buy" && transactionForm.symbol !== "USDT" && (
											<div className="flex justify-between text-sm">
												<span className="text-muted-foreground">{t('form.remaining')} USDT:</span>
												<span className={remainingUsdtBalance < 0 ? "text-red-500" : ""}>
													{remainingUsdtBalance.toFixed(2)} USDT
												</span>
											</div>
										)}
									</CardContent>
								</Card>
							)}

							<div className="flex gap-2 justify-end">
								<Button variant="outline" onClick={() => setIsAddingTransaction(false)}>
									{t('form.cancel')}
								</Button>
								<Button onClick={handleAddTransaction} disabled={addTransactionMutation.isPending}>
									{addTransactionMutation.isPending ? t('form.adding') : t('addTransaction')}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Portfolio Summary */}
			<PortfolioSummary />

			{/* Crypto Assets Table */}
			<CryptoAssetsTable
				assets={dashboardData?.assets || []}
				onViewDetails={handleViewDetails}
			/>
		</div>
	);
}