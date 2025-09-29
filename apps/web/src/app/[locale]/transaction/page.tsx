"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { api } from "@/utils/api";
import { formatCurrency, formatVnd, formatPercent, formatCrypto } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Search,
	Filter,
	Download,
	Calendar,
	TrendingUp,
	TrendingDown,
	ArrowUpDown,
	Eye,
	EyeOff,
	ChevronLeft,
	ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { LazyImage } from "@/components/lazy-image";

// Types
interface Transaction {
	id: string; // Changed to string for unified format
	originalId: number;
	source: 'crypto' | 'p2p';
	type: 'buy' | 'sell';
	quantity: number;
	pricePerUnit: number;
	totalAmount: number;
	fee: number;
	transactionDate: string;
	exchange?: string | null;
	notes?: string | null;
	asset: {
		id: number;
		symbol: string;
		name: string;
		logoUrl?: string;
	};
	// P2P specific data (optional)
	p2pData?: {
		platform: string | null;
		counterparty?: string | null;
		bankName?: string | null;
		transactionId?: string | null;
		exchangeRate: number;
		marketRate?: number | null;
		spreadPercent?: number | null;
	};
}

export default function TransactionPage() {
	const t = useTranslations('transaction');
	
	// State management
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedAsset, setSelectedAsset] = useState<string>("all");
	const [selectedType, setSelectedType] = useState<string>("all");
	const [sortBy, setSortBy] = useState<string>("date");
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [showBalances, setShowBalances] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(50);
	const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

	// Fetch data
	const { data: dashboardData, isLoading: dashboardLoading } = api.crypto.getDashboardData.useQuery();
	const { data: allTransactions, isLoading: transactionsLoading } = api.crypto.getAllTransactions.useQuery({ 
		limit: 1000 // Get all transactions including P2P
	});

	const vndRate = dashboardData?.vndRate?.usdToVnd || 25000;
	const isLoading = dashboardLoading || transactionsLoading;

	// Debug logging for USDT transactions
	useEffect(() => {
		const DEBUG = process.env.NEXT_PUBLIC_DEBUG_TRANSACTIONS === '1' || process.env.NODE_ENV !== 'production';
		if (!DEBUG || !allTransactions) return;

		const fmt2 = (n: number | null | undefined) =>
			Number(n ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		const fmtVnd = (n: number) =>
			new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
		const fmtUsd = (n: number) =>
			new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

		// Filter USDT transactions
		const usdtTransactions = allTransactions.filter(tx =>
			tx?.asset?.symbol === 'USDT'
		);

		if (usdtTransactions.length === 0) {
			console.log('📊 [Transaction Page] No USDT transactions found');
			return;
		}

		console.group(`📊 [Transaction Page] USDT Transaction Analysis`);
		console.log(`Found ${usdtTransactions.length} USDT transactions`);
		console.log('──────────────────────────────');

		// Separate buy and sell transactions
		const buyTransactions = usdtTransactions.filter(tx => tx?.type === 'buy');
		const sellTransactions = usdtTransactions.filter(tx => tx?.type === 'sell');

		console.log(`🟢 BUY Transactions: ${buyTransactions.length}`);
		console.log(`🔴 SELL Transactions: ${sellTransactions.length}`);
		console.log('');

		// Analyze SELL transactions in detail
		if (sellTransactions.length > 0) {
			console.group('🔴 USDT SELL Transaction Details');

			let totalSoldQuantity = 0;
			let totalSoldValueUSD = 0;
			let totalSoldValueVND = 0;
			let totalFees = 0;

			sellTransactions.forEach((tx, index) => {
				if (!tx) return;

				const sellQuantity = tx.quantity || 0;
				const pricePerUnit = tx.pricePerUnit || 0;
				const totalAmount = tx.totalAmount || 0;
				const fee = tx.fee || 0;
				const netReceived = totalAmount - fee;

				console.group(`[SELL #${index + 1}] ${format(new Date(tx.transactionDate), 'dd/MM/yyyy HH:mm')}`);
				console.log('📝 Transaction ID:', tx.id);
				console.log('📅 Date:', format(new Date(tx.transactionDate), 'PPpp'));
				console.log('');

				console.log('💰 SELL Calculation:');
				console.log(`   Quantity Sold: ${fmt2(sellQuantity)} USDT`);
				console.log(`   Price Per Unit: ${fmtUsd(pricePerUnit)} (${fmtVnd(pricePerUnit * vndRate)})`);
				console.log('');

				console.log('📊 Formula: Total = Quantity × Price Per Unit');
				console.log(`   Calculation: ${fmt2(sellQuantity)} × ${fmtUsd(pricePerUnit)} = ${fmtUsd(totalAmount)}`);
				console.log(`   ✅ Gross Amount: ${fmtUsd(totalAmount)} (${fmtVnd(totalAmount * vndRate)})`);
				console.log('');

				if (fee > 0) {
					console.log('💸 Fees:');
					console.log(`   Transaction Fee: ${fmtUsd(fee)} (${fmtVnd(fee * vndRate)})`);
					console.log(`   Fee Percentage: ${fmt2((fee / totalAmount) * 100)}%`);
					console.log('');

					console.log('📊 Net Received Formula: Gross Amount - Fees');
					console.log(`   Calculation: ${fmtUsd(totalAmount)} - ${fmtUsd(fee)} = ${fmtUsd(netReceived)}`);
					console.log(`   ✅ Net Received: ${fmtUsd(netReceived)} (${fmtVnd(netReceived * vndRate)})`);
				} else {
					console.log('   ✅ No fees - Net = Gross');
					console.log(`   ✅ Net Received: ${fmtUsd(netReceived)} (${fmtVnd(netReceived * vndRate)})`);
				}

				// Source and exchange info
				if (tx.source === 'p2p' && tx.p2pData) {
					console.log('');
					console.log('🏦 P2P Transaction Details:');
					console.log(`   Platform: ${tx.p2pData.platform || 'N/A'}`);
					if (tx.p2pData.exchangeRate) {
						console.log(`   Exchange Rate: ${fmt2(tx.p2pData.exchangeRate)} VND/USDT`);
					}
					if (tx.p2pData.marketRate) {
						console.log(`   Market Rate: ${fmt2(tx.p2pData.marketRate)} VND/USDT`);
						if (tx.p2pData.spreadPercent) {
							console.log(`   Spread: ${fmt2(tx.p2pData.spreadPercent)}%`);
						}
					}
					if (tx.p2pData.counterparty) {
						console.log(`   Counterparty: ${tx.p2pData.counterparty}`);
					}
				} else if (tx.exchange) {
					console.log('');
					console.log(`🏦 Exchange: ${tx.exchange}`);
				}

				if (tx.notes) {
					console.log('');
					console.log(`📝 Notes: ${tx.notes}`);
				}

				// Update totals
				totalSoldQuantity += sellQuantity;
				totalSoldValueUSD += totalAmount;
				totalSoldValueVND += totalAmount * vndRate;
				totalFees += fee;

				console.groupEnd();
			});

			console.log('');
			console.log('──────────────────────────────');
			console.log('📊 SELL TRANSACTIONS SUMMARY:');
			console.log(`   Total USDT Sold: ${fmt2(totalSoldQuantity)} USDT`);
			console.log(`   Total Value (Gross): ${fmtUsd(totalSoldValueUSD)} (${fmtVnd(totalSoldValueVND)})`);
			console.log(`   Total Fees: ${fmtUsd(totalFees)} (${fmtVnd(totalFees * vndRate)})`);
			console.log(`   Net Received: ${fmtUsd(totalSoldValueUSD - totalFees)} (${fmtVnd((totalSoldValueUSD - totalFees) * vndRate)})`);
			console.log(`   Average Sell Price: ${fmtUsd(totalSoldValueUSD / totalSoldQuantity)} per USDT`);

			console.groupEnd();
		} else {
			console.log('ℹ️ No USDT SELL transactions found');
		}

		// Analyze BUY transactions summary
		if (buyTransactions.length > 0) {
			console.log('');
			console.group('🟢 USDT BUY Transaction Summary');

			let totalBoughtQuantity = 0;
			let totalBoughtValueUSD = 0;
			let totalBuyFees = 0;

			buyTransactions.forEach(tx => {
				if (!tx) return;
				totalBoughtQuantity += tx.quantity || 0;
				totalBoughtValueUSD += tx.totalAmount || 0;
				totalBuyFees += tx.fee || 0;
			});

			console.log(`   Total USDT Bought: ${fmt2(totalBoughtQuantity)} USDT`);
			console.log(`   Total Spent (Gross): ${fmtUsd(totalBoughtValueUSD)} (${fmtVnd(totalBoughtValueUSD * vndRate)})`);
			console.log(`   Total Fees: ${fmtUsd(totalBuyFees)} (${fmtVnd(totalBuyFees * vndRate)})`);
			console.log(`   Total Cost: ${fmtUsd(totalBoughtValueUSD + totalBuyFees)} (${fmtVnd((totalBoughtValueUSD + totalBuyFees) * vndRate)})`);
			console.log(`   Average Buy Price: ${fmtUsd(totalBoughtValueUSD / totalBoughtQuantity)} per USDT`);

			console.groupEnd();
		}

		// Overall USDT position
		console.log('');
		console.log('──────────────────────────────');
		console.log('📊 OVERALL USDT POSITION:');

		const totalBought = buyTransactions.reduce((sum, tx) => sum + (tx?.quantity || 0), 0);
		const totalSold = sellTransactions.reduce((sum, tx) => sum + (tx?.quantity || 0), 0);
		const currentHoldings = totalBought - totalSold;

		console.log(`   Formula: Current Holdings = Total Bought - Total Sold`);
		console.log(`   Calculation: ${fmt2(totalBought)} - ${fmt2(totalSold)} = ${fmt2(currentHoldings)} USDT`);
		console.log(`   ✅ Current USDT Holdings: ${fmt2(currentHoldings)} USDT`);

		if (totalSold > totalBought) {
			console.error('⚠️ WARNING: Sold more USDT than bought! Check data consistency.');
		}

		console.groupEnd();
	}, [allTransactions, vndRate]);

	// Get unique assets for filter dropdown
	const uniqueAssets = useMemo(() => {
		if (!allTransactions) return [];
		const assets = new Map();
		allTransactions.forEach(tx => {
			if (tx && tx.asset && !assets.has(tx.asset.symbol)) {
				assets.set(tx.asset.symbol, tx.asset);
			}
		});
		return Array.from(assets.values());
	}, [allTransactions]);

	// Filter and sort transactions
	const filteredTransactions = useMemo(() => {
		if (!allTransactions) return [];
		
		let filtered = allTransactions.filter(tx => {
				// Search filter
				const searchMatch = searchTerm === "" || 
					tx?.asset?.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
					tx?.asset?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					tx?.exchange?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					tx?.notes?.toLowerCase().includes(searchTerm.toLowerCase());

				// Asset filter
				const assetMatch = selectedAsset === "all" || tx?.asset?.symbol === selectedAsset;

				// Type filter
				const typeMatch = selectedType === "all" || tx?.type === selectedType;

			return searchMatch && assetMatch && typeMatch;
		});

		// Sort transactions
		filtered.sort((a, b) => {
			if (!a || !b) return 0;
			let aValue: any, bValue: any;
			
			switch (sortBy) {
				case 'date':
					aValue = new Date(a.transactionDate);
					bValue = new Date(b.transactionDate);
					break;
				case 'asset':
					aValue = a.asset?.symbol || '';
					bValue = b.asset?.symbol || '';
					break;
				case 'amount':
					aValue = a.totalAmount || 0;
					bValue = b.totalAmount || 0;
					break;
				case 'quantity':
					aValue = a.quantity || 0;
					bValue = b.quantity || 0;
					break;
				default:
					aValue = new Date(a.transactionDate);
					bValue = new Date(b.transactionDate);
			}

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		return filtered;
	}, [allTransactions, searchTerm, selectedAsset, selectedType, sortBy, sortOrder]);

	// Pagination
	const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

	// Statistics
	const statistics = useMemo(() => {
		if (!filteredTransactions.length) return null;

		const totalBuys = filteredTransactions.filter(tx => tx?.type === 'buy').length;
		const totalSells = filteredTransactions.filter(tx => tx?.type === 'sell').length;
		// Calculate investment (BUY transactions only) with proper currency conversion
		// Debug: Let's see what we're adding
		let cryptoInvestmentUSD = 0;
		let p2pInvestmentUSD = 0;
		
		const totalInvestment = filteredTransactions
			.filter(tx => tx?.type === 'buy') // Only BUY transactions for investment calculation
			.reduce((sum, tx) => {
				if (!tx) return sum;
				if (tx.source === 'p2p') {
					// P2P transactions: use quantity (USDT ≈ USD)
					const p2pAmount = tx.quantity || 0;
					p2pInvestmentUSD += p2pAmount;
					return sum + p2pAmount;
				} else {
					// Crypto transactions: totalAmount is already in USD
					cryptoInvestmentUSD += (tx.totalAmount || 0);
					return sum + (tx.totalAmount || 0);
				}
			}, 0);
		
		// Debug output
		console.log('Investment Debug:', {
			cryptoInvestmentUSD: cryptoInvestmentUSD.toFixed(2),
			p2pInvestmentUSD: p2pInvestmentUSD.toFixed(2),
			totalInvestmentUSD: totalInvestment.toFixed(2),
			totalInvestmentVND: (totalInvestment * vndRate).toLocaleString(),
			totalTransactions: filteredTransactions.length,
			buyTransactions: filteredTransactions.filter(tx => tx?.type === 'buy').length,
			p2pCount: filteredTransactions.filter(tx => tx?.source === 'p2p').length,
			cryptoCount: filteredTransactions.filter(tx => tx?.source === 'crypto').length
		});
		// Calculate fees with proper currency conversion
		const totalFees = filteredTransactions.reduce((sum, tx) => {
			if (!tx) return sum;
			if (tx.source === 'p2p') {
				// P2P fees are in VND, convert to USD
				return sum + ((tx.fee || 0) / vndRate);
			} else {
				// Crypto fees are already in USD
				return sum + (tx.fee || 0);
			}
		}, 0);

		return {
			totalTransactions: filteredTransactions.length,
			totalBuys,
			totalSells,
			totalVolume: totalInvestment, // Now showing investment (BUY only) instead of trading volume
			totalFees
		};
	}, [filteredTransactions, vndRate]);

	// Mask sensitive values
	const maskValue = (value: string) => showBalances ? value : "••••••••";


	// Handle sort change
	const handleSort = (field: string) => {
		if (sortBy === field) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			setSortBy(field);
			setSortOrder('desc');
		}
	};

	// Export transactions
	const handleExport = () => {
		const exportData = filteredTransactions
			.filter(tx => tx != null)
			.map(tx => ({
				Date: format(new Date(tx.transactionDate), "yyyy-MM-dd HH:mm:ss"),
				Asset: tx.asset?.symbol,
				"Asset Name": tx.asset?.name,
				Type: tx.type.toUpperCase(),
				Quantity: tx.quantity,
				"Price Per Unit (USD)": tx.pricePerUnit,
				"Price Per Unit (VND)": tx.pricePerUnit * vndRate,
				"Total Amount (USD)": tx.totalAmount,
				"Total Amount (VND)": tx.totalAmount * vndRate,
				"Fee (USD)": tx.fee || 0,
				"Fee (VND)": (tx.fee || 0) * vndRate,
				Exchange: tx.source === 'p2p' && tx.p2pData?.platform 
					? `${tx.p2pData.platform} P2P`
					: tx.exchange || '',
				Notes: tx.notes || ''
			}));

		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.json`;
		a.click();
	};

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-6 max-w-7xl">
				<div className="space-y-6">
					<div className="h-8 w-64 bg-muted animate-pulse rounded" />
					<div className="h-32 bg-muted animate-pulse rounded" />
					<div className="h-96 bg-muted animate-pulse rounded" />
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6 max-w-7xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold">{t('title')}</h1>
					<p className="text-muted-foreground mt-1">
						{t('description')}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setShowBalances(!showBalances)}
					>
						{showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
					</Button>
					<Button onClick={handleExport}>
						<Download className="h-4 w-4 mr-2" />
						{t('export')}
					</Button>
				</div>
			</div>

			{/* Statistics Cards */}
			{statistics && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t('stats.total')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{statistics.totalTransactions}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t('stats.buys')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-green-600">{statistics.totalBuys}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t('stats.sells')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-red-600">{statistics.totalSells}</div>
						</CardContent>
					</Card>
					<Card className="min-w-0">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t('stats.volume')}
							</CardTitle>
						</CardHeader>
						<CardContent className="overflow-hidden">
							<div className="text-sm sm:text-base lg:text-lg font-bold break-words leading-tight">{maskValue(formatVnd(statistics.totalVolume * vndRate))}</div>
							<div className="text-xs text-muted-foreground truncate">{maskValue(formatCurrency(statistics.totalVolume))}</div>
						</CardContent>
					</Card>
					<Card className="min-w-0">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t('stats.fees')}
							</CardTitle>
						</CardHeader>
						<CardContent className="overflow-hidden">
							<div className="text-sm sm:text-base lg:text-lg font-bold break-words leading-tight">{maskValue(formatVnd(statistics.totalFees * vndRate))}</div>
							<div className="text-xs text-muted-foreground truncate">{maskValue(formatCurrency(statistics.totalFees))}</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Filters */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="text-lg">{t('filters.title')}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{/* Search */}
						<div className="space-y-2">
							<label className="text-sm font-medium">{t('filters.search')}</label>
							<div className="relative">
								<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder={t('filters.searchPlaceholder')}
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>

						{/* Asset Filter */}
						<div className="space-y-2">
							<label className="text-sm font-medium">{t('filters.asset')}</label>
							<Select value={selectedAsset} onValueChange={setSelectedAsset}>
								<SelectTrigger>
									<SelectValue placeholder={t('filters.allAssets')} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">{t('filters.allAssets')}</SelectItem>
									{uniqueAssets.map((asset) => (
										<SelectItem key={asset.symbol} value={asset.symbol}>
											{asset.symbol} - {asset.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Type Filter */}
						<div className="space-y-2">
							<label className="text-sm font-medium">{t('filters.type')}</label>
							<Select value={selectedType} onValueChange={setSelectedType}>
								<SelectTrigger>
									<SelectValue placeholder={t('filters.allTypes')} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">{t('filters.allTypes')}</SelectItem>
									<SelectItem value="buy">{t('filters.buy')}</SelectItem>
									<SelectItem value="sell">{t('filters.sell')}</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Sort */}
						<div className="space-y-2">
							<label className="text-sm font-medium">{t('filters.sortBy')}</label>
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger>
									<SelectValue placeholder={t('filters.sortBy')} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="date">{t('filters.sortDate')}</SelectItem>
									<SelectItem value="asset">{t('filters.sortAsset')}</SelectItem>
									<SelectItem value="amount">{t('filters.sortAmount')}</SelectItem>
									<SelectItem value="quantity">{t('filters.sortQuantity')}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Transactions Table */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>{t('table.title')}</CardTitle>
						<div className="text-sm text-muted-foreground">
							{t('table.showing', { 
								start: startIndex + 1, 
								end: Math.min(endIndex, filteredTransactions.length), 
								total: filteredTransactions.length 
							})}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="border-b">
								<tr>
									<th 
										className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50" 
										onClick={() => handleSort('date')}
									>
										<div className="flex items-center gap-2">
											{t('table.date')}
											<ArrowUpDown className="h-4 w-4" />
										</div>
									</th>
									<th className="text-left py-3 px-2">{t('table.type')}</th>
									<th 
										className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('asset')}
									>
										<div className="flex items-center gap-2">
											{t('table.asset')}
											<ArrowUpDown className="h-4 w-4" />
										</div>
									</th>
									<th 
										className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('quantity')}
									>
										<div className="flex items-center gap-2 justify-end">
											{t('table.quantity')}
											<ArrowUpDown className="h-4 w-4" />
										</div>
									</th>
									<th className="text-right py-3 px-2">{t('table.price')}</th>
									<th 
										className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('amount')}
									>
										<div className="flex items-center gap-2 justify-end">
											{t('table.total')}
											<ArrowUpDown className="h-4 w-4" />
										</div>
									</th>
									<th className="text-right py-3 px-2">{t('table.fee')}</th>
									<th className="text-left py-3 px-2">{t('table.exchange')}</th>
									<th className="text-center py-3 px-2">{t('table.actions')}</th>
								</tr>
							</thead>
							<tbody>
								{paginatedTransactions.map((tx) => 
									tx ? (
									<tr key={tx.id} className="border-b hover:bg-muted/30">
										<td className="py-4 px-2">
											<div>
												<div className="font-medium">
													{format(new Date(tx.transactionDate), "MMM dd, yyyy")}
												</div>
												<div className="text-xs text-muted-foreground">
													{format(new Date(tx.transactionDate), "HH:mm:ss")}
												</div>
											</div>
										</td>
										<td className="py-4 px-2">
											<Badge variant={tx.type === "buy" ? "default" : "destructive"}>
												{tx.type === "buy" ? (
													<>
														<TrendingUp className="h-3 w-3 mr-1" />
														{t('table.buy')}
													</>
												) : (
													<>
														<TrendingDown className="h-3 w-3 mr-1" />
														{t('table.sell')}
													</>
												)}
											</Badge>
										</td>
										<td className="py-4 px-2">
											<div className="flex items-center gap-2">
												<LazyImage
													src={tx.asset?.logoUrl || ""}
													alt={tx.asset?.symbol || ""}
													className="w-6 h-6"
													fallback={
														<div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
															{tx.asset?.symbol.slice(0, 2) || "?"}
														</div>
													}
												/>
												<div>
													<div className="font-medium">{tx.asset?.symbol}</div>
													<div className="text-xs text-muted-foreground">{tx.asset?.name}</div>
												</div>
											</div>
										</td>
										<td className="text-right py-4 px-2">
											<div className="font-medium">{formatCrypto(tx.quantity, tx.asset?.symbol)}</div>
										</td>
										<td className="text-right py-4 px-2">
											<div>
												<div className="font-medium">{maskValue(formatVnd(tx.pricePerUnit * vndRate))}</div>
												<div className="text-xs text-muted-foreground">{maskValue(formatCurrency(tx.pricePerUnit))}</div>
											</div>
										</td>
										<td className="text-right py-4 px-2">
											<div>
												<div className="font-medium">{maskValue(formatVnd(tx.totalAmount * vndRate))}</div>
												<div className="text-xs text-muted-foreground">{maskValue(formatCurrency(tx.totalAmount))}</div>
											</div>
										</td>
										<td className="text-right py-4 px-2">
											<div>
												<div className="font-medium">{maskValue(formatVnd((tx.fee || 0) * vndRate))}</div>
												<div className="text-xs text-muted-foreground">{maskValue(formatCurrency(tx.fee || 0))}</div>
											</div>
										</td>
										<td className="py-4 px-2">
											<div className="text-sm">
												{/* Display P2P platform for P2P transactions, otherwise show exchange */}
												{tx.source === 'p2p' && tx.p2pData?.platform 
													? `${tx.p2pData.platform} P2P`
													: tx.exchange || '-'
												}
											</div>
										</td>
										<td className="text-center py-4 px-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setSelectedTransaction(tx)}
											>
												<Eye className="h-4 w-4" />
											</Button>
										</td>
									</tr>
								) : null
								)}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-6">
							<div className="text-sm text-muted-foreground">
								{t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage - 1)}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4" />
									{t('pagination.previous')}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage + 1)}
									disabled={currentPage === totalPages}
								>
									{t('pagination.next')}
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Transaction Detail Modal */}
			{selectedTransaction && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>{t('detail.title')}</CardTitle>
							<Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)}>
								×
							</Button>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Transaction Overview */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-muted-foreground">{t('detail.id')}</label>
									<div className="font-mono text-sm">#{selectedTransaction.id}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">{t('detail.date')}</label>
									<div>{format(new Date(selectedTransaction.transactionDate), "PPpp")}</div>
								</div>
							</div>

							{/* Asset & Type */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-muted-foreground">{t('detail.asset')}</label>
									<div className="flex items-center gap-2 mt-1">
										<LazyImage
											src={selectedTransaction.asset?.logoUrl || ""}
											alt={selectedTransaction.asset?.symbol || ""}
											className="w-8 h-8"
											fallback={
												<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
													{selectedTransaction.asset?.symbol.slice(0, 2) || "?"}
												</div>
											}
										/>
										<div>
											<div className="font-medium">{selectedTransaction.asset?.symbol}</div>
											<div className="text-sm text-muted-foreground">{selectedTransaction.asset?.name}</div>
										</div>
									</div>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">{t('detail.type')}</label>
									<div className="mt-1">
										<Badge variant={selectedTransaction.type === "buy" ? "default" : "destructive"}>
											{selectedTransaction.type === "buy" ? (
												<>
													<TrendingUp className="h-3 w-3 mr-1" />
													{t('detail.buy')}
												</>
											) : (
												<>
													<TrendingDown className="h-3 w-3 mr-1" />
													{t('detail.sell')}
												</>
											)}
										</Badge>
									</div>
								</div>
							</div>

							{/* Financial Details */}
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground">{t('detail.quantity')}</label>
										<div className="text-lg font-medium">{formatCrypto(selectedTransaction.quantity, selectedTransaction.asset?.symbol)}</div>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">{t('detail.pricePerUnit')}</label>
										<div>
											<div className="font-medium">{maskValue(formatVnd(selectedTransaction.pricePerUnit * vndRate))}</div>
											<div className="text-sm text-muted-foreground">{maskValue(formatCurrency(selectedTransaction.pricePerUnit))}</div>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground">{t('detail.totalAmount')}</label>
										<div>
											<div className="font-bold text-lg">{maskValue(formatVnd(selectedTransaction.totalAmount * vndRate))}</div>
											<div className="text-sm text-muted-foreground">{maskValue(formatCurrency(selectedTransaction.totalAmount))}</div>
										</div>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">{t('detail.fee')}</label>
										<div>
											<div className="font-medium">{maskValue(formatVnd((selectedTransaction.fee || 0) * vndRate))}</div>
											<div className="text-sm text-muted-foreground">{maskValue(formatCurrency(selectedTransaction.fee || 0))}</div>
										</div>
									</div>
								</div>
							</div>

							{/* Additional Details */}
							<div className="space-y-4">
								{/* Exchange/Platform Information */}
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										{selectedTransaction.source === 'p2p' ? t('detail.platform') : t('detail.exchange')}
									</label>
									<div>
										{selectedTransaction.source === 'p2p' && selectedTransaction.p2pData?.platform
											? `${selectedTransaction.p2pData.platform} P2P`
											: selectedTransaction.exchange || '-'
										}
									</div>
								</div>

								{/* P2P Specific Details */}
								{selectedTransaction.source === 'p2p' && selectedTransaction.p2pData && (
									<div className="space-y-3">
										{selectedTransaction.p2pData.counterparty && (
											<div>
												<label className="text-sm font-medium text-muted-foreground">{t('detail.counterparty')}</label>
												<div>{selectedTransaction.p2pData.counterparty}</div>
											</div>
										)}
										{selectedTransaction.p2pData.bankName && (
											<div>
												<label className="text-sm font-medium text-muted-foreground">{t('detail.bankName')}</label>
												<div>{selectedTransaction.p2pData.bankName}</div>
											</div>
										)}
										{selectedTransaction.p2pData.transactionId && (
											<div>
												<label className="text-sm font-medium text-muted-foreground">{t('detail.transactionId')}</label>
												<div className="font-mono text-sm">{selectedTransaction.p2pData.transactionId}</div>
											</div>
										)}
										{selectedTransaction.p2pData.marketRate && selectedTransaction.p2pData.spreadPercent && (
											<div>
												<label className="text-sm font-medium text-muted-foreground">{t('detail.marketInfo')}</label>
												<div className="text-sm space-y-1">
													<div>Market Rate: {formatVnd(selectedTransaction.p2pData.marketRate)}</div>
													<div>Spread: {formatPercent(selectedTransaction.p2pData.spreadPercent / 100)}</div>
												</div>
											</div>
										)}
									</div>
								)}
								{selectedTransaction.notes && (
									<div>
										<label className="text-sm font-medium text-muted-foreground">{t('detail.notes')}</label>
										<div className="p-3 bg-muted rounded-md text-sm">{selectedTransaction.notes}</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}