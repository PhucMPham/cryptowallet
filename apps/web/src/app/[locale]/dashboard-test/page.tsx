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
	>("1D");

	// Fetch portfolio history
	const { data: historyData, isLoading: historyLoading } =
		api.crypto.getPortfolioHistory.useQuery({
			range: timeRange,
		});

	// Fetch asset allocation
	const { data: allocationData, isLoading: allocationLoading } =
		api.crypto.getAssetAllocation.useQuery();

	// Create snapshot mutation
	const createSnapshot = api.crypto.createPortfolioSnapshot.useMutation({
		onSuccess: () => {
			alert("Snapshot created successfully!");
			window.location.reload();
		},
	});

	// Clear history mutation
	const clearHistory = api.crypto.clearPortfolioHistory.useMutation({
		onSuccess: () => {
			alert("All snapshots cleared! Now create a new snapshot.");
			window.location.reload();
		},
	});

	return (
		<div className="min-h-screen bg-black text-white p-6">
			<div className="max-w-[1600px] mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Charts</h1>
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={() =>
								setDisplayCurrency((curr) => (curr === "VND" ? "USD" : "VND"))
							}
						>
							{displayCurrency === "VND" ? "Switch to USD" : "Switch to VND"}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => createSnapshot.mutate()}
							disabled={createSnapshot.isPending}
						>
							{createSnapshot.isPending ? "Creating..." : "Create Snapshot"}
						</Button>
					</div>
				</div>

				{/* Charts Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Portfolio Value Chart */}
					<PortfolioValueChart
						data={historyData || []}
						isLoading={historyLoading}
						displayCurrency={displayCurrency}
						selectedRange={timeRange}
						onRangeChange={setTimeRange}
					/>

					{/* Asset Allocation Chart */}
					<AssetAllocationChart
						assets={allocationData?.assets || []}
						totalValue={allocationData?.totalValue || 0}
						totalValueVnd={allocationData?.totalValueVnd || 0}
						isLoading={allocationLoading}
						displayCurrency={displayCurrency}
					/>
				</div>
			</div>
		</div>
	);
}