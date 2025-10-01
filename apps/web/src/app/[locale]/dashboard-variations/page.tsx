"use client";

import { useState, useMemo } from "react";
import { DashboardVariation1 } from "@/components/dashboard/DashboardVariation1";
import { AssetsTableVariation1 } from "@/components/dashboard/AssetsTableVariation1";
import { AssetsTableVariation2 } from "@/components/dashboard/AssetsTableVariation2";
import { AssetsTableVariation3 } from "@/components/dashboard/AssetsTableVariation3";
import { AssetsTableVariation4 } from "@/components/dashboard/AssetsTableVariation4";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function DashboardVariationsPage() {
	const [darkMode, setDarkMode] = useState(false);

	// Generate sample chart data for the past 24 hours
	const generateChartData = () => {
		const data = [];
		const now = new Date();
		const baseValue = 2125866628.73;

		for (let i = 24; i >= 0; i--) {
			const date = new Date(now.getTime() - i * 60 * 60 * 1000); // Every hour
			const randomVariation = (Math.random() - 0.5) * 50000000; // Random variation
			data.push({
				date,
				value: baseValue + randomVariation,
			});
		}
		return data;
	};

	// State for chart data
	const [chartData, setChartData] = useState(generateChartData());
	const [totalWorth, setTotalWorth] = useState(2125866628.73);

	// Calculate 24h change dynamically
	const calculate24hChange = () => {
		if (chartData.length < 2) {
			return { change: 0, changePercent: 0 };
		}

		// Compare current value with the first value (24h ago)
		const firstValue = chartData[0].value;
		const currentValue = totalWorth;
		const change = currentValue - firstValue;
		const changePercent = (change / firstValue) * 100;

		return { change, changePercent };
	};

	const { change, changePercent } = calculate24hChange();

	// Sample data
	const sampleData = {
		totalWorth,
		change,
		changePercent,
		currency: "VND",
		chartData,
	};

	// Base assets data with percentages - will scale with totalWorth
	const baseAssets = [
		{
			id: "1",
			name: "Ethereum",
			symbol: "ETH",
			iconColor: "#627EEA",
			amount: 8.461,
			change24h: 2.0,
			percentage: 0.4348, // 43.48% of total
			avgBuy: 108557360.65,
		},
		{
			id: "2",
			name: "Solana",
			symbol: "SOL",
			iconColor: "#14F195",
			amount: 125.02,
			change24h: 3.26,
			percentage: 0.3237, // 32.37% of total
			avgBuy: 5530469.17,
		},
		{
			id: "3",
			name: "Tether",
			symbol: "USDT",
			iconColor: "#26A17B",
			amount: 5775.5,
			change24h: -0.05,
			percentage: 0.0716, // 7.16% of total
			avgBuy: 0,
		},
		{
			id: "4",
			name: "Aster",
			symbol: "ASTER",
			iconColor: "#E15A97",
			amount: 2325.58,
			change24h: -8.75,
			percentage: 0.0484, // 4.84% of total
			avgBuy: 56836.86,
		},
		{
			id: "5",
			name: "PAX Gold",
			symbol: "PAXG",
			iconColor: "#F0B90B",
			amount: 0.9971,
			change24h: 1.04,
			percentage: 0.0483, // 4.83% of total
			avgBuy: 100521429.53,
		},
		{
			id: "6",
			name: "Chainlink",
			symbol: "LINK",
			iconColor: "#375BD2",
			amount: 174.85,
			change24h: -0.28,
			percentage: 0.048, // 4.8% of total
			avgBuy: 564959.72,
		},
		{
			id: "7",
			name: "STBL",
			symbol: "STBL",
			iconColor: "#6B46C1",
			amount: 5781,
			change24h: -22.16,
			percentage: 0.0252, // 2.52% of total
			avgBuy: 12344.51,
		},
	];

	// Dynamically calculate assets based on current totalWorth
	const sampleAssets = useMemo(() => {
		return baseAssets.map((asset) => {
			const total = totalWorth * asset.percentage;
			const price = total / asset.amount;
			const profitLoss = asset.avgBuy === 0 ? total : (price - asset.avgBuy) * asset.amount;
			const profitLossPercent = asset.avgBuy === 0 ? 0 : ((price - asset.avgBuy) / asset.avgBuy) * 100;

			return {
				...asset,
				price,
				total,
				profitLoss,
				profitLossPercent,
			};
		});
	}, [totalWorth]);

	const toggleDarkMode = () => {
		setDarkMode(!darkMode);
		document.documentElement.classList.toggle("dark");
	};

	const handleSyncAll = () => {
		console.log("Syncing all crypto prices from CoinMarketCap...");
		// TODO: Implement actual API sync logic
		alert("Syncing all crypto prices!");
	};

	const handleCreateSnapshot = () => {
		console.log("Creating new portfolio snapshot...");

		// Simulate creating a new snapshot with updated value
		const newValue = totalWorth + (Math.random() - 0.5) * 30000000; // Random variation
		const newSnapshot = {
			date: new Date(),
			value: newValue,
		};

		// Update chart data - add new point and keep last 25 points
		setChartData(prev => {
			const updated = [...prev, newSnapshot];
			// Keep only last 25 data points for clean chart
			return updated.slice(-25);
		});

		// Update total worth
		setTotalWorth(newValue);

		// Show success message
		console.log("New snapshot created:", newSnapshot);
	};

	return (
		<div className={`min-h-screen bg-background transition-colors ${darkMode ? "dark" : ""}`}>
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold text-foreground mb-2">
							Dashboard
						</h1>
						<p className="text-muted-foreground">
							Portfolio overview and analytics
						</p>
					</div>
					<Button
						onClick={toggleDarkMode}
						variant="outline"
						size="icon"
						className="rounded-full"
					>
						{darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
					</Button>
				</div>

				{/* Dashboard Content */}
				<div className="space-y-8">
					<DashboardVariation1 {...sampleData} onSyncAll={handleSyncAll} onCreateSnapshot={handleCreateSnapshot} />

					{/* Assets Table Variations */}
					<div className="space-y-12">
						<div>
							<div className="mb-4">
								<h3 className="text-lg font-bold text-foreground">Variation 1: Compact Modern</h3>
								<p className="text-sm text-muted-foreground">Clean table with subtle borders and hover effects</p>
							</div>
							<AssetsTableVariation1 assets={sampleAssets} />
						</div>

						<div>
							<div className="mb-4">
								<h3 className="text-lg font-bold text-foreground">Variation 2: Card-Based</h3>
								<p className="text-sm text-muted-foreground">Each asset as a card with prominent P/L display</p>
							</div>
							<AssetsTableVariation2 assets={sampleAssets} />
						</div>

						<div>
							<div className="mb-4">
								<h3 className="text-lg font-bold text-foreground">Variation 3: Dense Information</h3>
								<p className="text-sm text-muted-foreground">Highlighted P/L with alternating row backgrounds</p>
							</div>
							<AssetsTableVariation3 assets={sampleAssets} />
						</div>

						<div>
							<div className="mb-4">
								<h3 className="text-lg font-bold text-foreground">Variation 4: Minimal Zebra</h3>
								<p className="text-sm text-muted-foreground">Alternating backgrounds with rounded icons</p>
							</div>
							<AssetsTableVariation4 assets={sampleAssets} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
