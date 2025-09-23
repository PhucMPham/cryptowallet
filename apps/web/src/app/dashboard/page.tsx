"use client";

import { useState } from "react";
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
import { getCryptoLogo } from "@/utils/crypto-logos";
import Image from "next/image";

// Performance metrics calculation
const calculateMetrics = (portfolio: any, assets: any[], vndRate: number) => {
	const totalInvested = portfolio?.totalInvested || 0;
	const totalValue = portfolio?.totalValue || 0;
	const cryptoPnLUSD = portfolio?.totalPnL || 0;

	// Calculate total P&L in both currencies (now only from crypto since P2P is included)
	const totalPnLUSD = cryptoPnLUSD;
	const totalPnLVND = cryptoPnLUSD * vndRate;

	// Calculate ROI based on USD values
	const roi = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

	// Ensure ROI is a valid number
	const validRoi = !isNaN(roi) && isFinite(roi) ? roi : 0;

	// Calculate best and worst performers
	const sortedAssets = [...(assets || [])].sort((a, b) => (b.pnlPercent || 0) - (a.pnlPercent || 0));
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
					<h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
					<p className="text-muted-foreground mt-1">
						Comprehensive analysis and reporting of your investments
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
						Refresh
					</Button>
					<Button onClick={exportReport}>
						<Download className="h-4 w-4 mr-2" />
						Export Report
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
									Total Portfolio Value
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
									Total P&L
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
										{formatPercent(Math.abs(metrics.roi))}
									</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Diversification Score
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
									{metrics.diversificationScore > 70 ? 'Well Diversified' :
									 metrics.diversificationScore > 40 ? 'Moderate' : 'Concentrated'}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Risk Level
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{metrics.volatility}</div>
								<p className="text-xs text-muted-foreground mt-1">
									Based on 24h price changes
								</p>
								<Badge
									variant={metrics.volatility === "Low" ? "default" :
									        metrics.volatility === "Medium" ? "secondary" : "destructive"}
									className="mt-2"
								>
									{metrics.volatility === "Low" ? "Conservative" :
									 metrics.volatility === "Medium" ? "Balanced" : "Aggressive"}
								</Badge>
							</CardContent>
						</Card>
					</div>

					{/* Main Content Tabs */}
					<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
						<TabsList>
							<TabsTrigger value="overview">Overview</TabsTrigger>
							<TabsTrigger value="performance">Performance</TabsTrigger>
							<TabsTrigger value="allocation">Allocation</TabsTrigger>
							<TabsTrigger value="transactions">Transactions</TabsTrigger>
							<TabsTrigger value="insights">Insights</TabsTrigger>
						</TabsList>

						{/* Overview Tab */}
						<TabsContent value="overview" className="space-y-4">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Portfolio Composition */}
								<Card>
									<CardHeader>
										<CardTitle>Portfolio Composition</CardTitle>
										<CardDescription>Asset allocation by value</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{dashboardData?.assets?.map((asset: any) => {
												const percentage = (asset.currentValue / totalPortfolioValueUSD) * 100;
												return (
													<div key={asset.asset.id} className="space-y-2">
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-2">
																<Image
																	src={getCryptoLogo(asset.asset.symbol)}
																	alt={asset.asset.symbol}
																	width={24}
																	height={24}
																	className="rounded-full"
																/>
																<span className="font-medium">{asset.asset.symbol}</span>
															</div>
															<span className="text-sm text-muted-foreground">
																{formatPercent(percentage)}
															</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-2">
															<div
																className="bg-blue-600 h-2 rounded-full"
																style={{ width: `${percentage}%` }}
															/>
														</div>
													</div>
												);
											})}
										</div>
									</CardContent>
								</Card>

								{/* Top Performers */}
								<Card>
									<CardHeader>
										<CardTitle>Performance Highlights</CardTitle>
										<CardDescription>Best and worst performing assets</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										{metrics.bestPerformer && (
											<div className="p-4 border rounded-lg bg-green-50 border-green-200">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<TrendingUp className="h-5 w-5 text-green-600" />
														<div>
															<p className="font-medium">Best Performer</p>
															<p className="text-sm text-muted-foreground">
																{metrics.bestPerformer.asset.name}
															</p>
														</div>
													</div>
													<div className="text-right">
														<p className="font-bold text-green-600">
															+{formatPercent(metrics.bestPerformer.pnlPercent)}
														</p>
														<p className="text-sm text-muted-foreground">
															+{formatVnd(metrics.bestPerformer.pnl * vndRate)}
														</p>
													</div>
												</div>
											</div>
										)}

										{metrics.worstPerformer && metrics.worstPerformer.pnl < 0 && (
											<div className="p-4 border rounded-lg bg-red-50 border-red-200">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<TrendingDown className="h-5 w-5 text-red-600" />
														<div>
															<p className="font-medium">Worst Performer</p>
															<p className="text-sm text-muted-foreground">
																{metrics.worstPerformer.asset.name}
															</p>
														</div>
													</div>
													<div className="text-right">
														<p className="font-bold text-red-600">
															{formatPercent(metrics.worstPerformer.pnlPercent)}
														</p>
														<p className="text-sm text-muted-foreground">
															{formatVnd(metrics.worstPerformer.pnl * vndRate)}
														</p>
													</div>
												</div>
											</div>
										)}

										{/* Investment Summary */}
										<div className="pt-4 border-t space-y-2">
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">Total Invested</span>
												<span className="font-medium">
													{maskValue(formatVnd(totalInvestedVND))}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">Current Value</span>
												<span className="font-medium">
													{maskValue(formatVnd(totalPortfolioValueVND))}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">Total Return</span>
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
									<CardTitle>Recent Activity</CardTitle>
									<CardDescription>Latest transactions across all assets</CardDescription>
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
															{tx.type === "buy" ? "Bought" : "Sold"} {formatCrypto(tx.quantity)} {tx.asset?.symbol}
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
										<div className="text-center text-sm text-blue-600 hover:underline mt-4 pt-4 border-t">
											View all transactions
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						{/* Performance Tab */}
						<TabsContent value="performance" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Performance Analysis</CardTitle>
									<CardDescription>Detailed performance metrics for each asset</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="border-b">
												<tr>
													<th className="text-left py-2">Asset</th>
													<th className="text-right py-2">Holdings</th>
													<th className="text-right py-2">Avg Buy Price</th>
													<th className="text-right py-2">Current Price</th>
													<th className="text-right py-2">Current Value</th>
													<th className="text-right py-2">P&L</th>
													<th className="text-right py-2">P&L %</th>
													<th className="text-right py-2">24h Change</th>
												</tr>
											</thead>
											<tbody>
												{dashboardData?.assets?.map((item: any) => (
													<tr key={item.asset.id} className="border-b hover:bg-gray-50">
														<td className="py-3">
															<div className="flex items-center gap-2">
																<Image
																	src={getCryptoLogo(item.asset.symbol)}
																	alt={item.asset.symbol}
																	width={32}
																	height={32}
																	className="rounded-full"
																/>
																<div>
																	<p className="font-medium">{item.asset.symbol}</p>
																	<p className="text-sm text-muted-foreground">{item.asset.name}</p>
																</div>
															</div>
														</td>
														<td className="text-right py-3">
															{formatCrypto(item.totalQuantity)}
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
														<td className={`text-right py-3 font-medium ${item.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
															{item.pnl >= 0 ? '+' : ''}{maskValue(formatVnd(item.pnl * vndRate))}
														</td>
														<td className={`text-right py-3 font-medium ${item.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
															{item.pnlPercent >= 0 ? '+' : ''}{formatPercent(item.pnlPercent)}
														</td>
														<td className={`text-right py-3 ${item.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
															{item.priceChange24h >= 0 ? '+' : ''}{formatPercent(item.priceChange24h)}
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
										<CardTitle>Asset Allocation</CardTitle>
										<CardDescription>Portfolio distribution by asset</CardDescription>
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
																{formatVnd(asset.currentValue * vndRate)} ({formatPercent(percentage)})
															</span>
														</div>
														<div className="w-full bg-gray-200 rounded-full h-3">
															<div
																className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
																style={{ width: `${percentage}%` }}
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
										<CardTitle>Rebalancing Suggestions</CardTitle>
										<CardDescription>Optimize your portfolio allocation</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{dashboardData?.assets?.map((asset: any) => {
												const currentAllocation = (asset.currentValue / totalPortfolioValueUSD) * 100;
												const targetAllocation = 100 / dashboardData.assets.length;
												const difference = currentAllocation - targetAllocation;

												if (Math.abs(difference) > 5) {
													return (
														<div key={asset.asset.id} className="p-3 border rounded-lg">
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-2">
																	<Image
																		src={getCryptoLogo(asset.asset.symbol)}
																		alt={asset.asset.symbol}
																		width={24}
																		height={24}
																		className="rounded-full"
																	/>
																	<span className="font-medium">{asset.asset.symbol}</span>
																</div>
																<Badge variant={difference > 0 ? "destructive" : "default"}>
																	{difference > 0 ? "Overweight" : "Underweight"}
																</Badge>
															</div>
															<div className="mt-2 text-sm text-muted-foreground">
																Current: {formatPercent(currentAllocation)} → Target: {formatPercent(targetAllocation)}
															</div>
															<div className="mt-1 text-sm">
																{difference > 0 ? "Consider selling" : "Consider buying"} {formatVnd(Math.abs(difference * totalPortfolioValueUSD / 100) * vndRate)}
															</div>
														</div>
													);
												}
												return null;
											})}
											{dashboardData?.assets?.every((asset: any) => {
												const currentAllocation = (asset.currentValue / totalPortfolioValueUSD) * 100;
												const targetAllocation = 100 / dashboardData.assets.length;
												return Math.abs(currentAllocation - targetAllocation) <= 5;
											}) && (
												<div className="text-center py-8 text-muted-foreground">
													<CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
													<p>Your portfolio is well balanced!</p>
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
									<CardTitle>Transaction History</CardTitle>
									<CardDescription>Complete history of all your trades</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="border-b">
												<tr>
													<th className="text-left py-2">Date</th>
													<th className="text-left py-2">Type</th>
													<th className="text-left py-2">Asset</th>
													<th className="text-right py-2">Quantity</th>
													<th className="text-right py-2">Price</th>
													<th className="text-right py-2">Total</th>
													<th className="text-right py-2">Fee</th>
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
																<Image
																	src={getCryptoLogo(tx.asset?.symbol)}
																	alt={tx.asset?.symbol || ""}
																	width={24}
																	height={24}
																	className="rounded-full"
																/>
																<span>{tx.asset?.symbol}</span>
															</div>
														</td>
														<td className="text-right py-3">
															{formatCrypto(tx.quantity)}
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
									<div className="text-center text-sm text-blue-600 hover:underline mt-4 pt-4 border-t">
										View all transactions
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Insights Tab */}
						<TabsContent value="insights" className="space-y-4">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<Card>
									<CardHeader>
										<CardTitle>Investment Insights</CardTitle>
										<CardDescription>Key observations about your portfolio</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										{/* ROI Analysis */}
										<div className="p-4 border rounded-lg">
											<div className="flex items-start gap-3">
												<Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
												<div>
													<p className="font-medium">Return on Investment</p>
													<p className="text-sm text-muted-foreground mt-1">
														Your portfolio has generated a {metrics.roi >= 0 ? 'profit' : 'loss'} of {formatPercent(Math.abs(metrics.roi))} since inception
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
										<CardTitle>Recommendations</CardTitle>
										<CardDescription>Suggested actions to optimize your portfolio</CardDescription>
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
									<CardTitle>Market Context</CardTitle>
									<CardDescription>How your portfolio compares to market conditions</CardDescription>
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
											<p className="text-2xl font-bold">{formatPercent(metrics.roi)}</p>
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