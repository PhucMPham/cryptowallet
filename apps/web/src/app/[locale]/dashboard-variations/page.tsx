"use client";

import { useState } from "react";
import { DashboardVariation1 } from "@/components/dashboard/DashboardVariation1";
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
		<div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors ${darkMode ? "dark" : ""}`}>
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
							Dashboard
						</h1>
						<p className="text-zinc-600 dark:text-zinc-400">
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
				<DashboardVariation1 {...sampleData} onSyncAll={handleSyncAll} onCreateSnapshot={handleCreateSnapshot} />
			</div>
		</div>
	);
}
