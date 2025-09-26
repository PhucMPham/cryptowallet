"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Link } from '@/navigation';
import { api } from "@/utils/api";
import { formatCurrency, formatVnd, formatPercent, formatCrypto } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	Activity,
	Download,
	PieChart,
	ArrowUpRight,
	ArrowDownRight,
	AlertCircle,
	Calculator,
	Target,
	Clock,
	Hash,
	Percent,
	RefreshCw,
	Eye,
	EyeOff,
	ChevronRight,
	CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { LazyImage } from "@/components/lazy-image";
import { PortfolioPieChart } from "@/components/portfolio-pie-chart";

// Performance metrics calculation
const calculateMetrics = (portfolio: any, assets: any[], vndRate: number) => {
	const totalInvested = portfolio?.totalInvested || 0;
	const totalValue = portfolio?.totalValue || 0;
	const cryptoPnLUSD = portfolio?.totalPnL || 0;

	// Calculate total P&L in both currencies (now only from crypto since P2P is included)
	const totalPnLUSD = cryptoPnLUSD;
	const totalPnLVND = cryptoPnLUSD * vndRate;

	// Calculate ROI based on USD values
	// Handle edge cases properly:
	// - If no investment and no value: 0%
	// - If no investment but has value (e.g., from airdrops/rewards): show 0% to avoid infinity
	// - If investment exists: calculate normal ROI
	let roi = 0;
	if (totalInvested > 0) {
		roi = ((totalValue - totalInvested) / totalInvested) * 100;
	} else if (totalValue > 0) {
		// Has value but no investment - avoid showing infinity
		roi = 0;
	}

	// Ensure ROI is a valid number and handle edge cases
	const validRoi = !isNaN(roi) && isFinite(roi) ? roi : 0;

	// Calculate best and worst performers
	const sortedAssets = [...(assets || [])].sort((a, b) => (b.unrealizedPLPercent || 0) - (a.unrealizedPLPercent || 0));
	const bestPerformer = sortedAssets[0];
	const worstPerformer = sortedAssets[sortedAssets.length - 1];

	// Calculate diversification score (0-100)
	const diversificationScore = calculateDiversificationScore(assets);

	// Calculate risk metrics
	const volatility = calculateVolatility(assets);

	return {
		roi: validRoi,
		bestPerformer,
		worstPerformer,
		diversificationScore,
		volatility,
		totalPnLUSD: !isNaN(totalPnLUSD) ? totalPnLUSD : 0,
		totalPnLVND: !isNaN(totalPnLVND) ? totalPnLVND : 0,
	};
};

const calculateDiversificationScore = (assets: any[]) => {
	if (!assets || assets.length === 0) return 0;
	if (assets.length === 1) return 10;

	// Calculate portfolio concentration
	const totalValue = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
	const weights = assets.map(asset => (asset.currentValue || 0) / totalValue);

	// Herfindahl-Hirschman Index (HHI) - lower is more diversified
	const hhi = weights.reduce((sum, weight) => sum + Math.pow(weight, 2), 0);

	// Convert to 0-100 score (inverse of HHI)
	const score = Math.max(0, Math.min(100, (1 - hhi) * 100));
	return Math.round(score);
};

const calculateVolatility = (assets: any[]) => {
	// Check if assets is undefined or empty
	if (!assets || assets.length === 0) return "Low";

	// Simplified volatility based on 24h price changes
	const changes = assets.map(a => Math.abs(a.priceChange24h || 0));
	const avgChange = changes.length > 0 ? changes.reduce((sum, c) => sum + c, 0) / changes.length : 0;

	if (avgChange < 2) return "Low";
	if (avgChange < 5) return "Medium";
	if (avgChange < 10) return "High";
	return "Very High";
};

// Loading skeleton
const DashboardSkeleton = () => (
	<div className="space-y-6">
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{[...Array(4)].map((_, i) => (
				<Skeleton key={i} className="h-32" />
			))}
		</div>
		<Skeleton className="h-96" />
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<Skeleton className="h-64" />
			<Skeleton className="h-64" />
		</div>
	</div>
);

export default function DashboardPage() {
	const t = useTranslations('dashboard');
	const router = useRouter();
	const [refreshing, setRefreshing] = useState(false);
	const [showBalances, setShowBalances] = useState(true);
	const [activeTab, setActiveTab] = useState("overview");

	// Fetch all data
	const { data: dashboardData, isLoading: cryptoLoading, refetch: refetchCrypto } =
		api.crypto.getDashboardData.useQuery(undefined, {
			refetchInterval: 60000,
			staleTime: 30000,
		});

	const { data: p2pSummary, isLoading: p2pLoading } =
		api.p2p.getPortfolioSummary.useQuery({
			crypto: "USDT",
			fiatCurrency: "VND",
		}, {
			refetchInterval: 60000,
		});

	const { data: recentTransactions } =
		api.crypto.getRecentTransactions.useQuery(
			{ limit: 20 },
			{ enabled: !!dashboardData }
		);

	// Calculate metrics
	const vndRate = dashboardData?.vndRate?.usdToVnd || 25000;
	const metrics = calculateMetrics(dashboardData?.portfolio, dashboardData?.assets, vndRate);

	// All values are now in the crypto portfolio (including P2P USDT)
	const totalPortfolioValueUSD = dashboardData?.portfolio?.totalValue || 0;
	const totalPortfolioValueVND = totalPortfolioValueUSD * vndRate;

	const totalInvestedUSD = dashboardData?.portfolio?.totalInvested || 0;
	const totalInvestedVND = totalInvestedUSD * vndRate;

	// Handle refresh
	const handleRefresh = async () => {
		setRefreshing(true);
		await refetchCrypto();
		setTimeout(() => setRefreshing(false), 1000);
	};

	// Navigate to transaction page to view all transactions
	const handleViewAllTransactions = () => {
		console.log('View all transactions clicked!');
		router.push('/transaction');
	};

	// Export report function
	const exportReport = () => {
		const report = {
			generatedAt: new Date().toISOString(),
			portfolio: {
				totalValueVND: totalPortfolioValueVND,
				totalValueUSD: totalPortfolioValueUSD,
				totalInvestedVND: totalInvestedVND,
				totalInvestedUSD: totalInvestedUSD,
				totalPnLVND: metrics.totalPnLVND,
				totalPnLUSD: metrics.totalPnLUSD,
				roi: metrics.roi,
				assets: dashboardData?.assets,
			},
			p2p: p2pSummary?.summary,
			metrics: {
				diversificationScore: metrics.diversificationScore,
				volatility: metrics.volatility,
			},
		};

		const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `portfolio-report-${format(new Date(), "yyyy-MM-dd")}.json`;
		a.click();
	};

	const isLoading = cryptoLoading || p2pLoading;

	// Mask sensitive values
	const maskValue = (value: string) => showBalances ? value : "••••••••";

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
					<Button
						variant="outline"
						onClick={handleRefresh}
						disabled={refreshing}
					>
						<RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
						{t('buttons.refresh')}
					</Button>
					<Button onClick={exportReport}>
						<Download className="h-4 w-4 mr-2" />
						{t('buttons.exportReport')}
					</Button>
				</div>
			</div>

			{isLoading ? (
				<DashboardSkeleton />
			) : (
				<>
					{/* Key Metrics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t('metrics.totalPortfolioValue')}
							</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{maskValue(formatVnd(totalPortfolioValueVND))}
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									≈ {maskValue(formatCurrency(totalPortfolioValueUSD))}
								</p>
								{dashboardData?.vndRate && (
									<Badge variant="outline" className="mt-2 text-xs">
										1 USD = {formatVnd(vndRate)}
									</Badge>
								)}
							</CardContent>
						</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t('metrics.totalPL')}
						</CardTitle>
							</CardHeader>
							<CardContent>
								<div className={`text-2xl font-bold ${metrics.totalPnLVND >= 0 ? 'text-green-600' : 'text-red-600'}`}>
									{metrics.totalPnLVND >= 0 ? '+' : ''}{maskValue(formatVnd(metrics.totalPnLVND))}
								</div>
								<div className="flex items-center gap-2 mt-1">
									{metrics.totalPnLVND >= 0 ? (
										<TrendingUp className="h-4 w-4 text-green-600" />
									) : (
										<TrendingDown className="h-4 w-4 text-red-600" />
									)}
									<span className={`text-sm font-medium ${metrics.totalPnLVND >= 0 ? 'text-green-600' : 'text-red-600'}`}>
										{!isNaN(metrics.roi) && isFinite(metrics.roi) ? formatPercent(Math.abs(metrics.roi)) : '0.00%'}
									</span>
								</div>
							</CardContent>
						</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t('metrics.diversificationScore')}
						</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{metrics.diversificationScore}/100</div>
								<div className="mt-2">
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className={`h-2 rounded-full ${
												metrics.diversificationScore > 70 ? 'bg-green-600' :
												metrics.diversificationScore > 40 ? 'bg-yellow-600' : 'bg-red-600'
											}`}
											style={{ width: `${metrics.diversificationScore}%` }}
										/>
									</div>
								</div>
							<p className="text-xs text-muted-foreground mt-1">
								{metrics.diversificationScore > 70 ? t('metrics.wellDiversified') :
								 metrics.diversificationScore > 40 ? t('metrics.moderate') : t('metrics.concentrated')}
							</p>
							</CardContent>
						</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t('metrics.riskLevel')}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{t(`riskLevels.${metrics.volatility.toLowerCase()}`)}</div>
						<p className="text-xs text-muted-foreground mt-1">
							{t('metrics.basedOn24h')}
						</p>
						<Badge
							variant={metrics.volatility === "Low" ? "default" :
							        metrics.volatility === "Medium" ? "secondary" : "destructive"}
							className="mt-2"
						>
							{metrics.volatility === "Low" ? t('metrics.conservative') :
							 metrics.volatility === "Medium" ? t('metrics.balanced') : t('metrics.aggressive')}
						</Badge>
							</CardContent>
						</Card>
					</div>

					{/* Main Content Tabs */}
				<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
					<TabsList>
						<TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
						<TabsTrigger value="performance">{t('tabs.performance')}</TabsTrigger>
						<TabsTrigger value="allocation">{t('tabs.allocation')}</TabsTrigger>
						<TabsTrigger value="transactions">{t('tabs.transactions')}</TabsTrigger>
						<TabsTrigger value="insights">{t('tabs.insights')}</TabsTrigger>
					</TabsList>

						{/* Overview Tab */}
						<TabsContent value="overview" className="space-y-4">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Portfolio Composition */}
						<Card>
							<CardHeader>
								<CardTitle>{t('overview.portfolioComposition.title')}</CardTitle>
								<CardDescription>{t('overview.portfolioComposition.description')}</CardDescription>
							</CardHeader>
									<CardContent>
										<PortfolioPieChart
											assets={dashboardData?.assets || []}
											totalPortfolioValueUSD={totalPortfolioValueUSD}
											vndRate={vndRate}
										/>
									</CardContent>
								</Card>

						{/* Top Performers */}
						<Card>
							<CardHeader>
								<CardTitle>{t('overview.performanceHighlights.title')}</CardTitle>
								<CardDescription>{t('overview.performanceHighlights.description')}</CardDescription>
							</CardHeader>
									<CardContent className="space-y-4">
										{metrics.bestPerformer && (
											<div className="p-4 border rounded-lg bg-green-50 border-green-200">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
											<TrendingUp className="h-5 w-5 text-green-600" />
											<div>
												<p className="font-medium">{t('overview.performanceHighlights.bestPerformer')}</p>
															<p className="text-sm text-muted-foreground">
																{metrics.bestPerformer.asset.name}
															</p>
														</div>
													</div>
													<div className="text-right">
														<p className="font-bold text-green-600">
															{!isNaN(metrics.bestPerformer.unrealizedPLPercent) && isFinite(metrics.bestPerformer.unrealizedPLPercent) ?
													'+' + formatPercent(metrics.bestPerformer.unrealizedPLPercent) :
													'+0.00%'
												}
														</p>
														<p className="text-sm text-muted-foreground">
															+{formatVnd(metrics.bestPerformer.unrealizedPL * vndRate)}
														</p>
													</div>
												</div>
											</div>
										)}

										{metrics.worstPerformer && metrics.worstPerformer.unrealizedPL < 0 && (
											<div className="p-4 border rounded-lg bg-red-50 border-red-200">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
											<TrendingDown className="h-5 w-5 text-red-600" />
											<div>
												<p className="font-medium">{t('overview.performanceHighlights.worstPerformer')}</p>
															<p className="text-sm text-muted-foreground">
																{metrics.worstPerformer.asset.name}
															</p>
														</div>
													</div>
													<div className="text-right">
														<p className="font-bold text-red-600">
															{!isNaN(metrics.worstPerformer.unrealizedPLPercent) && isFinite(metrics.worstPerformer.unrealizedPLPercent) ?
													formatPercent(metrics.worstPerformer.unrealizedPLPercent) :
													'0.00%'
												}
														</p>
														<p className="text-sm text-muted-foreground">
															{formatVnd(metrics.worstPerformer.unrealizedPL * vndRate)}
														</p>
													</div>
												</div>
											</div>
										)}

									{/* Investment Summary */}
									<div className="pt-4 border-t space-y-2">
										<div className="flex justify-between">
											<span className="text-sm text-muted-foreground">{t('overview.investmentSummary.totalInvested')}</span>
												<span className="font-medium">
													{maskValue(formatVnd(totalInvestedVND))}
												</span>
											</div>
										<div className="flex justify-between">
											<span className="text-sm text-muted-foreground">{t('overview.investmentSummary.currentValue')}</span>
											<span className="font-medium">
												{maskValue(formatVnd(totalPortfolioValueVND))}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-sm text-muted-foreground">{t('overview.investmentSummary.totalReturn')}</span>
												<span className={`font-medium ${metrics.totalPnLVND >= 0 ? 'text-green-600' : 'text-red-600'}`}>
													{metrics.totalPnLVND >= 0 ? '+' : ''}{maskValue(formatVnd(metrics.totalPnLVND))}
												</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>

					{/* Recent Activity */}
					<Card>
						<CardHeader>
							<CardTitle>{t('overview.recentActivity.title')}</CardTitle>
							<CardDescription>{t('overview.recentActivity.description')}</CardDescription>
						</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{recentTransactions?.slice(0, 5).map((tx: any) => (
											<div key={tx.id} className="flex items-center justify-between py-2">
												<div className="flex items-center gap-3">
													<div className={`p-2 rounded-full ${
														tx.type === "buy" ? "bg-green-100" : "bg-red-100"
													}`}>
														{tx.type === "buy" ? (
															<ArrowDownRight className="h-4 w-4 text-green-600" />
														) : (
															<ArrowUpRight className="h-4 w-4 text-red-600" />
														)}
													</div>
													<div>
											<p className="font-medium">
												{tx.type === "buy" ? t('overview.recentActivity.bought') : t('overview.recentActivity.sold')} {formatCrypto(tx.quantity, tx.asset?.symbol)} {tx.asset?.symbol}
											</p>
														<p className="text-sm text-muted-foreground">
															{format(new Date(tx.transactionDate), "MMM dd, yyyy HH:mm")}
														</p>
													</div>
												</div>
												<div className="text-right">
													<p className="font-medium">
														{maskValue(formatVnd(tx.totalAmount * vndRate))}
													</p>
													<p className="text-sm text-muted-foreground">
														@ {formatVnd(tx.pricePerUnit * vndRate)}
													</p>
												</div>
											</div>
										))}
									</div>
							{recentTransactions && recentTransactions.length > 5 && (
								<div className="mt-4 pt-4 border-t">
									<Link 
										href="/transaction"
										className="block w-full py-2 px-4 text-center text-sm text-blue-600 hover:text-blue-700 hover:underline hover:bg-blue-50 transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
									>
										{t('overview.recentActivity.viewAllTransactions')}
									</Link>
								</div>
							)}
								</CardContent>
							</Card>
						</TabsContent>

					{/* Performance Tab */}
					<TabsContent value="performance" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>{t('performance.title')}</CardTitle>
								<CardDescription>{t('performance.description')}</CardDescription>
							</CardHeader>
								<CardContent>
									<div className="overflow-x-auto">
										<table className="w-full">
									<thead className="border-b">
										<tr>
											<th className="text-left py-2">{t('performance.headers.asset')}</th>
											<th className="text-right py-2">{t('performance.headers.holdings')}</th>
											<th className="text-right py-2">{t('performance.headers.avgBuyPrice')}</th>
											<th className="text-right py-2">{t('performance.headers.currentPrice')}</th>
											<th className="text-right py-2">{t('performance.headers.currentValue')}</th>
											<th className="text-right py-2">{t('performance.headers.pl')}</th>
											<th className="text-right py-2">{t('performance.headers.plPercent')}</th>
											<th className="text-right py-2">{t('performance.headers.change24h')}</th>
										</tr>
									</thead>
											<tbody>
												{dashboardData?.assets?.map((item: any) => (
													<tr key={item.asset.id} className="border-b hover:bg-gray-50">
														<td className="py-3">
															<div className="flex items-center gap-2">
																<LazyImage
																	src={item.logoUrl || ""}
																	alt={item.asset.symbol}
																	className="w-8 h-8"
																	fallback={
																		<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
																			{item.asset.symbol.slice(0, 2)}
																		</div>
																	}
																/>
																<div>
																	<p className="font-medium">{item.asset.symbol}</p>
																	<p className="text-sm text-muted-foreground">{item.asset.name}</p>
																</div>
															</div>
														</td>
														<td className="text-right py-3">
															{formatCrypto(item.totalQuantity, item.asset?.symbol)}
														</td>
														<td className="text-right py-3">
															{maskValue(formatVnd(item.avgBuyPrice * vndRate))}
														</td>
														<td className="text-right py-3">
															{maskValue(formatVnd(item.currentPrice * vndRate))}
														</td>
														<td className="text-right py-3">
															{maskValue(formatVnd(item.currentValue * vndRate))}
														</td>
														<td className={`text-right py-3 font-medium ${item.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
															{item.unrealizedPL >= 0 ? '+' : ''}{maskValue(formatVnd(item.unrealizedPL * vndRate))}
														</td>
														<td className={`text-right py-3 font-medium ${item.unrealizedPLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
															{!isNaN(item.unrealizedPLPercent) && isFinite(item.unrealizedPLPercent) ?
											`${item.unrealizedPLPercent >= 0 ? '+' : ''}${formatPercent(item.unrealizedPLPercent)}` :
											'0.00%'
										}
														</td>
														<td className={`text-right py-3 ${(item.priceChange24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
															{item.priceChange24h !== undefined && !isNaN(item.priceChange24h) && isFinite(item.priceChange24h) ?
																`${item.priceChange24h >= 0 ? '+' : ''}${formatPercent(item.priceChange24h)}` :
																'0.00%'
															}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Allocation Tab */}
						<TabsContent value="allocation" className="space-y-4">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle>{t('allocation.assetAllocation.title')}</CardTitle>
								<CardDescription>{t('allocation.assetAllocation.description')}</CardDescription>
							</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{dashboardData?.assets?.map((asset: any) => {
												const percentage = (asset.currentValue / totalPortfolioValueUSD) * 100;
												return (
													<div key={asset.asset.id}>
														<div className="flex justify-between mb-1">
															<span className="text-sm font-medium">{asset.asset.symbol}</span>
															<span className="text-sm text-muted-foreground">
																{formatVnd(asset.currentValue * vndRate)} ({!isNaN(percentage) && isFinite(percentage) ? formatPercent(percentage) : '0.00%'})
															</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-3">
															<div
																className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
																style={{ width: `${!isNaN(percentage) && isFinite(percentage) ? Math.min(percentage, 100) : 0}%` }}
															/>
														</div>
													</div>
												);
											})}
										</div>
									</CardContent>
								</Card>

						<Card>
							<CardHeader>
								<CardTitle>{t('allocation.rebalancingSuggestions.title')}</CardTitle>
								<CardDescription>{t('allocation.rebalancingSuggestions.description')}</CardDescription>
							</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{dashboardData?.assets?.map((asset: any) => {
												// Calculate allocations safely
												let currentAllocation = 0;
												if (totalPortfolioValueUSD > 0) {
													currentAllocation = (asset.currentValue / totalPortfolioValueUSD) * 100;
												} else if (dashboardData?.assets?.length > 0) {
													currentAllocation = 100 / dashboardData.assets.length;
												}
												currentAllocation = !isNaN(currentAllocation) && isFinite(currentAllocation) ? currentAllocation : 0;
												const targetAllocation = dashboardData?.assets?.length > 0 ? 100 / dashboardData.assets.length : 0;
												const difference = currentAllocation - targetAllocation;

												if (Math.abs(difference) > 5) {
													return (
														<div key={asset.asset.id} className="p-3 border rounded-lg">
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-2">
																	<LazyImage
																		src={asset.logoUrl || ""}
																		alt={asset.asset.symbol}
																		className="w-6 h-6"
																		fallback={
																			<div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
																				{asset.asset.symbol.slice(0, 2)}
																			</div>
																		}
																	/>
																	<span className="font-medium">{asset.asset.symbol}</span>
																</div>
													<Badge variant={difference > 0 ? "destructive" : "default"}>
														{difference > 0 ? t('allocation.rebalancingSuggestions.overweight') : t('allocation.rebalancingSuggestions.underweight')}
													</Badge>
															</div>
												<div className="mt-2 text-sm text-muted-foreground">
													{t('allocation.rebalancingSuggestions.current')}: {formatPercent(currentAllocation)} → {t('allocation.rebalancingSuggestions.target')}: {formatPercent(targetAllocation)}
												</div>
												<div className="mt-1 text-sm">
													{difference > 0 ? t('allocation.rebalancingSuggestions.considerSelling') : t('allocation.rebalancingSuggestions.considerBuying')} {formatVnd(Math.abs(difference * totalPortfolioValueUSD / 100) * vndRate)}
												</div>
														</div>
													);
												}
												return null;
											})}
											{dashboardData?.assets?.every((asset: any) => {
												// Calculate allocations safely
												let currentAllocation = 0;
												if (totalPortfolioValueUSD > 0) {
													currentAllocation = (asset.currentValue / totalPortfolioValueUSD) * 100;
												} else if (dashboardData?.assets?.length > 0) {
													currentAllocation = 100 / dashboardData.assets.length;
												}
												currentAllocation = !isNaN(currentAllocation) && isFinite(currentAllocation) ? currentAllocation : 0;
												const targetAllocation = dashboardData?.assets?.length > 0 ? 100 / dashboardData.assets.length : 0;
												return Math.abs(currentAllocation - targetAllocation) <= 5;
											}) && (
												<div className="text-center py-8 text-muted-foreground">
													<CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
													<p>{t('allocation.rebalancingSuggestions.wellBalanced')}</p>
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						{/* Transactions Tab */}
						<TabsContent value="transactions" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>{t('transactionHistory.title')}</CardTitle>
									<CardDescription>{t('transactionHistory.description')}</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="border-b">
												<tr>
													<th className="text-left py-2">{t('transactionHistory.headers.date')}</th>
													<th className="text-left py-2">{t('transactionHistory.headers.type')}</th>
													<th className="text-left py-2">{t('transactionHistory.headers.asset')}</th>
													<th className="text-right py-2">{t('transactionHistory.headers.quantity')}</th>
													<th className="text-right py-2">{t('transactionHistory.headers.price')}</th>
													<th className="text-right py-2">{t('transactionHistory.headers.total')}</th>
													<th className="text-right py-2">{t('transactionHistory.headers.fee')}</th>
												</tr>
											</thead>
											<tbody>
												{recentTransactions?.map((tx: any) => (
													<tr key={tx.id} className="border-b hover:bg-gray-50">
														<td className="py-3">
															{format(new Date(tx.transactionDate), "MMM dd, yyyy HH:mm")}
														</td>
														<td className="py-3">
															<Badge variant={tx.type === "buy" ? "default" : "secondary"}>
																{tx.type}
															</Badge>
														</td>
										<td className="py-3">
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
												<span>{tx.asset?.symbol}</span>
											</div>
										</td>
														<td className="text-right py-3">
															{formatCrypto(tx.quantity, tx.asset?.symbol)}
														</td>
														<td className="text-right py-3">
															{maskValue(formatVnd(tx.pricePerUnit * vndRate))}
														</td>
														<td className="text-right py-3">
															{maskValue(formatVnd(tx.totalAmount * vndRate))}
														</td>
														<td className="text-right py-3">
															{maskValue(formatVnd(tx.fee * vndRate))}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									<div className="mt-4 pt-4 border-t">
										<Link 
											href="/transaction"
											className="block w-full py-2 px-4 text-center text-sm text-blue-600 hover:text-blue-700 hover:underline hover:bg-blue-50 transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
										>
											{t('transactionHistory.viewAllTransactions')}
										</Link>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Insights Tab */}
						<TabsContent value="insights" className="space-y-4">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<Card>
									<CardHeader>
										<CardTitle>{t('insights.investmentInsights.title')}</CardTitle>
										<CardDescription>{t('insights.investmentInsights.description')}</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										{/* ROI Analysis */}
										<div className="p-4 border rounded-lg">
											<div className="flex items-start gap-3">
												<Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
												<div>
													<p className="font-medium">Return on Investment</p>
													<p className="text-sm text-muted-foreground mt-1">
														Your portfolio has generated a {metrics.roi >= 0 ? 'profit' : 'loss'} of {!isNaN(metrics.roi) && isFinite(metrics.roi) ? formatPercent(Math.abs(metrics.roi)) : '0.00%'} since inception
													</p>
													{metrics.roi >= 10 && (
														<Badge className="mt-2" variant="default">
															Outperforming expectations
														</Badge>
													)}
												</div>
											</div>
										</div>

										{/* Diversification Analysis */}
										<div className="p-4 border rounded-lg">
											<div className="flex items-start gap-3">
												<PieChart className="h-5 w-5 text-purple-600 mt-0.5" />
												<div>
													<p className="font-medium">Diversification Analysis</p>
													<p className="text-sm text-muted-foreground mt-1">
														{metrics.diversificationScore > 70 ?
															"Your portfolio is well-diversified, reducing risk exposure" :
														 metrics.diversificationScore > 40 ?
															"Consider adding more assets to improve diversification" :
															"Your portfolio is concentrated. Consider diversifying to reduce risk"
														}
													</p>
												</div>
											</div>
										</div>

										{/* Volatility Assessment */}
										<div className="p-4 border rounded-lg">
											<div className="flex items-start gap-3">
												<Activity className="h-5 w-5 text-orange-600 mt-0.5" />
												<div>
													<p className="font-medium">Volatility Assessment</p>
													<p className="text-sm text-muted-foreground mt-1">
														{metrics.volatility === "Low" ?
															"Your portfolio shows low volatility, suitable for conservative investors" :
														 metrics.volatility === "Medium" ?
															"Moderate volatility detected, balanced risk-reward profile" :
															"High volatility detected. Expect larger price swings"
														}
													</p>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>{t('insights.recommendations.title')}</CardTitle>
										<CardDescription>{t('insights.recommendations.description')}</CardDescription>
									</CardHeader>
									<CardContent className="space-y-3">
										{/* Dynamic recommendations based on metrics */}
										{metrics.diversificationScore < 50 && (
											<div className="p-3 border rounded-lg border-yellow-200 bg-yellow-50">
												<div className="flex items-start gap-2">
													<AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
													<div>
														<p className="text-sm font-medium">Improve Diversification</p>
														<p className="text-xs text-muted-foreground mt-1">
															Consider adding 2-3 more assets to reduce concentration risk
														</p>
													</div>
												</div>
											</div>
										)}

										{metrics.roi < -10 && (
											<div className="p-3 border rounded-lg border-red-200 bg-red-50">
												<div className="flex items-start gap-2">
													<TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />
													<div>
														<p className="text-sm font-medium">Review Loss-Making Positions</p>
														<p className="text-xs text-muted-foreground mt-1">
															Consider tax-loss harvesting or averaging down on fundamentally strong assets
														</p>
													</div>
												</div>
											</div>
										)}

										{metrics.roi > 20 && (
											<div className="p-3 border rounded-lg border-green-200 bg-green-50">
												<div className="flex items-start gap-2">
													<TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
													<div>
														<p className="text-sm font-medium">Consider Taking Profits</p>
														<p className="text-xs text-muted-foreground mt-1">
															Your portfolio is up significantly. Consider rebalancing or taking some profits
														</p>
													</div>
												</div>
											</div>
										)}

										<div className="p-3 border rounded-lg">
											<div className="flex items-start gap-2">
												<Target className="h-4 w-4 text-blue-600 mt-0.5" />
												<div>
													<p className="text-sm font-medium">Set Investment Goals</p>
													<p className="text-xs text-muted-foreground mt-1">
														Define clear targets for each position to make informed decisions
													</p>
												</div>
											</div>
										</div>

										<div className="p-3 border rounded-lg">
											<div className="flex items-start gap-2">
												<Clock className="h-4 w-4 text-purple-600 mt-0.5" />
												<div>
													<p className="text-sm font-medium">Regular Review</p>
													<p className="text-xs text-muted-foreground mt-1">
														Schedule monthly portfolio reviews to stay on track with your goals
													</p>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Market Context */}
								<Card>
									<CardHeader>
										<CardTitle>{t('insights.marketContext.title')}</CardTitle>
										<CardDescription>{t('insights.marketContext.description')}</CardDescription>
									</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div className="text-center p-4 border rounded-lg">
											<Hash className="h-8 w-8 mx-auto mb-2 text-blue-600" />
											<p className="text-2xl font-bold">{dashboardData?.assets?.length || 0}</p>
											<p className="text-sm text-muted-foreground">Assets Held</p>
										</div>
										<div className="text-center p-4 border rounded-lg">
											<Percent className="h-8 w-8 mx-auto mb-2 text-green-600" />
											<p className="text-2xl font-bold">{!isNaN(metrics.roi) && isFinite(metrics.roi) ? formatPercent(metrics.roi) : '0.00%'}</p>
											<p className="text-sm text-muted-foreground">Total ROI</p>
										</div>
										<div className="text-center p-4 border rounded-lg">
											<Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
											<p className="text-2xl font-bold">{recentTransactions?.length || 0}</p>
											<p className="text-sm text-muted-foreground">Total Trades</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</>
			)}
		</div>
	);
}