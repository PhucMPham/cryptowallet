"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { formatCurrency, formatVnd, formatPercent, formatCrypto } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Home,
	Wallet,
	TrendingUp,
	TrendingDown,
	Activity,
	Settings,
	HelpCircle,
	Plus,
	ArrowUpRight,
	ArrowDownRight,
	DollarSign,
	Bitcoin,
	BarChart3,
	Clock,
	Star,
	Bell,
	Search,
	MoreVertical,
	ExternalLink,
	Coins,
	Repeat,
	PlusCircle,
	RefreshCw,
	Eye,
	EyeOff,
	Send,
	ArrowDown,
	ArrowUp,
	Grid3x3,
	User
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import Image from "next/image";
import { getCryptoLogo } from "@/utils/crypto-logos";

// Loading component for skeleton states
const DashboardSkeleton = () => (
	<>
		<Skeleton className="h-32 w-full" />
		<div className="grid grid-cols-4 gap-4">
			{[...Array(4)].map((_, i) => (
				<Skeleton key={i} className="h-24" />
			))}
		</div>
		<Skeleton className="h-96" />
	</>
);

export default function DashboardPage() {
	const router = useRouter();
	const [refreshing, setRefreshing] = useState(false);
	const [showBalances, setShowBalances] = useState(true);

	// Fetch crypto portfolio data
	const {
		data: dashboardData,
		isLoading: cryptoLoading,
		refetch: refetchCrypto
	} = api.crypto.getDashboardData.useQuery(undefined, {
		refetchInterval: 60000,
		staleTime: 30000,
	});

	// Fetch P2P transactions data
	const {
		data: p2pTransactions,
		isLoading: p2pLoading
	} = api.p2p.getTransactions.useQuery({
		crypto: "USDT",
		fiatCurrency: "VND",
	}, {
		refetchInterval: 60000,
	});

	// Fetch recent crypto transactions
	const { data: recentTransactions } = api.crypto.getTransactionsByAsset.useQuery(
		{ limit: 10 },
		{ enabled: !!dashboardData }
	);

	// Calculate total portfolio value
	const vndRate = dashboardData?.vndRate?.usdToVnd || 25000;
	const totalCryptoValue = dashboardData?.portfolio?.totalValue || 0;
	const totalP2PValue = p2pTransactions?.summary?.totalUsdtValue || 0;
	const totalPortfolioValueUSD = totalCryptoValue + totalP2PValue;
	const totalPortfolioValueVND = totalPortfolioValueUSD * vndRate;

	// Calculate P&L
	const totalPnL = dashboardData?.portfolio?.totalPnL || 0;
	const totalPnLPercent = dashboardData?.portfolio?.totalPnLPercent || 0;
	const p2pProfit = p2pTransactions?.summary?.totalProfit || 0;
	const totalPnLVND = (totalPnL + p2pProfit) * vndRate;

	// Handle refresh
	const handleRefresh = async () => {
		setRefreshing(true);
		await refetchCrypto();
		setTimeout(() => setRefreshing(false), 1000);
	};

	const formatDate = (dateString: string) => {
		try {
			return format(new Date(dateString), "MMM dd, HH:mm");
		} catch {
			return dateString;
		}
	};

	const isLoading = cryptoLoading || p2pLoading;

	// Mask balance display
	const maskValue = (value: string) => {
		if (showBalances) return value;
		return "••••••••";
	};

	return (
		<div className="min-h-screen bg-white">
			{/* Clean Sidebar */}
			<div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 z-10">
				<div className="p-6">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
							<div className="w-4 h-4 bg-white rounded-full" />
						</div>
						<span className="text-lg font-semibold">Coinbase</span>
					</div>
				</div>

				<nav className="px-4">
					<ul className="space-y-1">
						<li>
							<Link
								href="/dashboard"
								className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 font-medium"
							>
								<Home className="h-5 w-5" />
								Home
							</Link>
						</li>
						<li>
							<Link
								href="/crypto"
								className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600"
							>
								<Grid3x3 className="h-5 w-5" />
								My assets
							</Link>
						</li>
						<li>
							<Link
								href="/transactions"
								className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600"
							>
								<Activity className="h-5 w-5" />
								Transactions
							</Link>
						</li>
						<li>
							<Link
								href="/explore"
								className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600"
							>
								<Search className="h-5 w-5" />
								Explore
							</Link>
						</li>
						<li>
							<Link
								href="/p2p"
								className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600"
							>
								<Repeat className="h-5 w-5" />
								P2P Trading
							</Link>
						</li>
						<li>
							<Link
								href="/rewards"
								className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600"
							>
								<Star className="h-5 w-5" />
								Learning rewards
							</Link>
						</li>
					</ul>

					<div className="mt-8 pt-8 border-t border-gray-100">
						<ul className="space-y-1">
							<li>
								<Link
									href="/settings"
									className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600"
								>
									<Settings className="h-5 w-5" />
									Settings
								</Link>
							</li>
							<li>
								<Link
									href="/help"
									className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600"
								>
									<HelpCircle className="h-5 w-5" />
									More
								</Link>
							</li>
						</ul>
					</div>
				</nav>
			</div>

			{/* Main content */}
			<div className="ml-64">
				{/* Clean Top Header */}
				<div className="border-b border-gray-100">
					<div className="px-8 py-6">
						<div className="flex items-center justify-between">
							<h1 className="text-3xl font-bold text-gray-900">Home</h1>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
									<Search className="h-4 w-4 text-gray-500" />
									<input
										type="text"
										placeholder="Search for an asset"
										className="bg-transparent outline-none text-sm w-64"
									/>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setShowBalances(!showBalances)}
									className="hover:bg-gray-100"
								>
									{showBalances ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="hover:bg-gray-100"
								>
									<Bell className="h-5 w-5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="hover:bg-gray-100"
								>
									<User className="h-5 w-5" />
								</Button>
							</div>
						</div>
					</div>
				</div>

				<div className="p-8">
					{isLoading ? (
						<DashboardSkeleton />
					) : (
						<div className="grid grid-cols-3 gap-8">
							{/* Left Column - Main Content */}
							<div className="col-span-2 space-y-6">
								{/* Portfolio Value Card */}
								<div className="bg-white rounded-xl p-6">
									<div className="flex items-center justify-between mb-8">
										<div>
											<h2 className="text-6xl font-bold text-gray-900">
												{maskValue(formatVnd(totalPortfolioValueVND))}
											</h2>
											<div className="flex items-center gap-4 mt-2">
												<span className="text-gray-500">
													≈ {maskValue(formatCurrency(totalPortfolioValueUSD))}
												</span>
												{dashboardData?.vndRate && (
													<Badge variant="outline" className="text-xs">
														1 USD = {formatVnd(dashboardData.vndRate.usdToVnd)}
													</Badge>
												)}
											</div>
										</div>
										<div className="bg-white rounded-full w-32 h-32 border-8 border-gray-100">
											{/* Placeholder for chart */}
											<div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
										</div>
									</div>

									{/* Quick Actions */}
									<div className="grid grid-cols-4 gap-3">
										<Button
											className="bg-blue-600 hover:bg-blue-700 text-white h-12"
											onClick={() => router.push("/crypto")}
										>
											Buy
										</Button>
										<Button
											variant="outline"
											className="h-12 border-gray-200"
											onClick={() => router.push("/crypto")}
										>
											Sell
										</Button>
										<Button
											variant="outline"
											className="h-12 border-gray-200"
										>
											Convert
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={handleRefresh}
											disabled={refreshing}
											className="h-12"
										>
											<MoreVertical className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
										</Button>
									</div>
								</div>

								{/* Balance & Staking Cards */}
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-sm transition-shadow cursor-pointer">
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-2">
												<Wallet className="h-5 w-5 text-gray-400" />
												<span className="text-sm text-gray-600">Crypto</span>
											</div>
											<ArrowUpRight className="h-4 w-4 text-gray-400" />
										</div>
										<div className="space-y-1">
											<p className="text-sm text-gray-500">Balance</p>
											<p className="text-2xl font-semibold">
												{maskValue(formatVnd(totalCryptoValue * vndRate))}
											</p>
										</div>
									</div>

									<div className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-sm transition-shadow cursor-pointer">
										<div className="flex items-center justify-between mb-2">
											<div className="flex items-center gap-2">
												<TrendingUp className="h-5 w-5 text-gray-400" />
												<span className="text-sm text-gray-600">Staking</span>
											</div>
											<ArrowUpRight className="h-4 w-4 text-gray-400" />
										</div>
										<div className="space-y-1">
											<p className="text-sm text-gray-500">Earn up to 5.75% APY</p>
											<p className="text-2xl font-semibold">Earn</p>
										</div>
									</div>
								</div>

								{/* For you section */}
								<div>
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold">For you</h3>
										<div className="flex gap-2">
											<Button variant="ghost" size="icon" className="h-8 w-8">
												<ArrowDown className="h-4 w-4 rotate-90" />
											</Button>
											<Button variant="ghost" size="icon" className="h-8 w-8">
												<ArrowUp className="h-4 w-4 rotate-90" />
											</Button>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
											<h4 className="font-semibold mb-2">Trade perpetuals now</h4>
											<p className="text-sm opacity-90">
												Fees as low as 0.00% for a limited time
											</p>
										</div>
										<div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
											<h4 className="font-semibold mb-2">Transfer USD with SWIFT</h4>
											<p className="text-sm opacity-90">
												Send USD to and from your bank via international wires
											</p>
										</div>
									</div>
								</div>

								{/* Prices Section */}
								<div>
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold">Prices</h3>
										<Link href="/crypto" className="text-sm text-blue-600 hover:underline">
											Watchlist →
										</Link>
									</div>

									<div className="bg-white border border-gray-100 rounded-xl">
										{dashboardData?.assets?.slice(0, 5).map((item, index) => {
											const currentValue = item.currentValue || 0;
											const currentPrice = item.currentPrice || 0;
											const pnl = item.pnl || 0;
											const pnlPercent = item.pnlPercent || 0;
											const change24h = item.priceChange24h || 0;

											return (
												<div
													key={item.asset.id}
													className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
														index !== dashboardData.assets.length - 1 && index < 4 ? 'border-b border-gray-100' : ''
													}`}
													onClick={() => router.push(`/crypto/${item.asset.id}`)}
												>
													<div className="flex items-center gap-3">
														<div className="relative w-10 h-10">
															<Image
																src={getCryptoLogo(item.asset.symbol)}
																alt={item.asset.symbol}
																width={40}
																height={40}
																className="rounded-full"
																onError={(e) => {
																	e.currentTarget.src = `https://ui-avatars.com/api/?name=${item.asset.symbol}&background=3b82f6&color=fff`;
																}}
															/>
														</div>
														<div>
															<p className="font-medium">{item.asset.name}</p>
															<p className="text-sm text-gray-500">{item.asset.symbol}</p>
														</div>
													</div>
													<div className="text-center">
														<p className="font-medium">
															{maskValue(formatVnd(currentPrice * vndRate))}
														</p>
														<p className="text-sm text-gray-500">
															{maskValue(formatCurrency(currentPrice))}
														</p>
													</div>
													<div className="text-right">
														<p className={`font-medium ${change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
															{change24h >= 0 ? '↑' : '↓'} {formatPercent(Math.abs(change24h))}
														</p>
														<p className="text-sm text-gray-500">
															{formatCrypto(item.totalQuantity)} {item.asset.symbol}
														</p>
													</div>
													<Button
														className="bg-blue-600 hover:bg-blue-700 text-white px-6"
														onClick={(e) => {
															e.stopPropagation();
															router.push("/crypto");
														}}
													>
														Buy
													</Button>
												</div>
											);
										})}
										{(!dashboardData?.assets || dashboardData.assets.length === 0) && (
											<div className="text-center py-12">
												<Coins className="h-12 w-12 mx-auto mb-3 text-gray-300" />
												<p className="text-gray-500">No assets yet</p>
												<Button
													className="mt-3"
													onClick={() => router.push("/crypto")}
												>
													Add your first asset
												</Button>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Right Column - Sidebar */}
							<div className="space-y-6">
								{/* P&L Summary */}
								<div className="bg-white border border-gray-100 rounded-xl p-6">
									<h3 className="font-semibold mb-4">Today's P&L</h3>
									<div className="space-y-3">
										<div>
											<p className="text-sm text-gray-500 mb-1">Total Change</p>
											<p className={`text-2xl font-bold ${(totalPnL + p2pProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												{(totalPnL + p2pProfit) >= 0 ? '+' : ''}{maskValue(formatVnd(totalPnLVND))}
											</p>
											<p className="text-sm text-gray-500">
												{formatPercent(totalPnLPercent)}
											</p>
										</div>

										<div className="pt-3 border-t border-gray-100">
											<div className="flex justify-between items-center mb-2">
												<span className="text-sm text-gray-600">Crypto P&L</span>
												<span className={`text-sm font-medium ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
													{maskValue(formatVnd(totalPnL * vndRate))}
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-sm text-gray-600">P2P Profit</span>
												<span className={`text-sm font-medium ${p2pProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
													{maskValue(formatVnd(p2pProfit * vndRate))}
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* Quick Stats */}
								<div className="bg-white border border-gray-100 rounded-xl p-6">
									<h3 className="font-semibold mb-4">Portfolio Stats</h3>
									<div className="space-y-3">
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">Assets</span>
											<span className="text-sm font-medium">{dashboardData?.assets?.length || 0}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">P2P Trades</span>
											<span className="text-sm font-medium">{p2pTransactions?.transactions?.length || 0}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">Total Invested</span>
											<span className="text-sm font-medium">
												{maskValue(formatVnd((dashboardData?.portfolio?.totalInvested || 0) * vndRate))}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-sm text-gray-600">Current Value</span>
											<span className="text-sm font-medium">
												{maskValue(formatVnd((dashboardData?.portfolio?.totalValue || 0) * vndRate))}
											</span>
										</div>
									</div>
								</div>

								{/* Recent Activity */}
								<div className="bg-white border border-gray-100 rounded-xl p-6">
									<h3 className="font-semibold mb-4">Recent Activity</h3>
									<div className="space-y-3">
										{recentTransactions?.slice(0, 4).map((tx: any) => (
											<div key={tx.id} className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div
														className={`w-8 h-8 rounded-full flex items-center justify-center ${
															tx.type === "buy" ? "bg-green-100" : "bg-red-100"
														}`}
													>
														{tx.type === "buy" ? (
															<ArrowDownRight className="h-4 w-4 text-green-600" />
														) : (
															<ArrowUpRight className="h-4 w-4 text-red-600" />
														)}
													</div>
													<div>
														<p className="text-sm font-medium">
															{tx.type === "buy" ? "Bought" : "Sold"} {tx.asset?.symbol}
														</p>
														<p className="text-xs text-gray-500">
															{formatDate(tx.transactionDate)}
														</p>
													</div>
												</div>
												<p className="text-sm font-medium">
													{maskValue(formatVnd(tx.totalAmount * vndRate))}
												</p>
											</div>
										))}
										{(!recentTransactions || recentTransactions.length === 0) && (
											<p className="text-center text-sm text-gray-500 py-4">
												No recent transactions
											</p>
										)}
									</div>
									{recentTransactions && recentTransactions.length > 0 && (
										<Link
											href="/transactions"
											className="block text-center text-sm text-blue-600 hover:underline mt-4 pt-4 border-t border-gray-100"
										>
											View all transactions
										</Link>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}