"use client";

import { api } from "@/utils/api";
import { PortfolioValueChart } from "@/components/dashboard/PortfolioValueChart";
import { AssetAllocationChart } from "@/components/dashboard/AssetAllocationChart";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardTestPage() {
	const [displayCurrency, setDisplayCurrency] = useState<"VND" | "USD">("VND");
	const [timeRange, setTimeRange] = useState<
		"1D" | "1W" | "1M" | "3M" | "1Y" | "ALL"
	>("1W");

	// Fetch portfolio history
	const { data: historyData, isLoading: historyLoading } =
		api.crypto.getPortfolioHistory.useQuery({
			range: timeRange,
		});

	// Fetch asset allocation
	const { data: allocationData, isLoading: allocationLoading } =
		api.crypto.getAssetAllocation.useQuery();

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Dashboard Charts Test</h1>
					<p className="text-muted-foreground mt-1">
						Testing Phase 2 chart components with real data
					</p>
				</div>
				<Button
					variant="outline"
					onClick={() =>
						setDisplayCurrency((curr) => (curr === "VND" ? "USD" : "VND"))
					}
				>
					Switch to {displayCurrency === "VND" ? "USD" : "VND"}
				</Button>
			</div>

			{/* Portfolio Value Chart */}
			<section>
				<h2 className="text-xl font-semibold mb-4">Portfolio Value Over Time</h2>
				<PortfolioValueChart
					data={historyData || []}
					isLoading={historyLoading}
					displayCurrency={displayCurrency}
				/>
			</section>

			{/* Asset Allocation Chart */}
			<section>
				<h2 className="text-xl font-semibold mb-4">Asset Allocation</h2>
				<AssetAllocationChart
					assets={allocationData?.assets || []}
					totalValue={allocationData?.totalValue || 0}
					totalValueVnd={allocationData?.totalValueVnd || 0}
					isLoading={allocationLoading}
					displayCurrency={displayCurrency}
				/>
			</section>

			{/* Debug Info */}
			<section className="bg-muted p-4 rounded-lg">
				<h3 className="font-semibold mb-2">Debug Information</h3>
				<div className="space-y-2 text-sm">
					<div>
						<span className="font-medium">History Data Points:</span>{" "}
						{historyData?.length || 0}
					</div>
					<div>
						<span className="font-medium">Assets:</span>{" "}
						{allocationData?.assets?.length || 0}
					</div>
					<div>
						<span className="font-medium">Total Value (USD):</span> $
						{allocationData?.totalValue?.toFixed(2) || 0}
					</div>
					<div>
						<span className="font-medium">Total Value (VND):</span> ₫
						{allocationData?.totalValueVnd?.toLocaleString() || 0}
					</div>
				</div>
			</section>
		</div>
	);
}