#!/usr/bin/env bun
// Validates: API endpoint correctly handles USDT payment source
// Created: 2025-09-23 for API integration validation

async function validateApiIntegration() {
	console.log("🔍 Validating API integration for USDT payments...\n");

	const API_URL = "http://localhost:3003/trpc";

	try {
		// 1. First get the current USDT balance
		const dashboardResponse = await fetch(`${API_URL}/crypto.getDashboardData?batch=1&input=%7B%7D`);
		const dashboardData = await dashboardResponse.json();

		const usdtAsset = dashboardData[0].result.data.assets.find((a: any) => a.asset.symbol === "USDT");
		const initialBalance = usdtAsset?.totalQuantity || 0;

		console.log(`Initial USDT balance via API: ${initialBalance.toFixed(2)} USDT`);

		// 2. Test adding a transaction with USDT payment
		const testTransaction = {
			symbol: "BTC",
			name: "Bitcoin",
			type: "buy",
			quantity: 0.001,
			pricePerUnit: 50000,
			fee: 0,
			feeCurrency: "USD",
			paymentSource: "USDT",
			exchange: "API Test",
			notes: "Integration test",
			transactionDate: new Date().toISOString(),
		};

		const expectedUsdtSpent = testTransaction.quantity * testTransaction.pricePerUnit;
		console.log(`\n📝 Test: Buy ${testTransaction.quantity} BTC at $${testTransaction.pricePerUnit} using USDT`);
		console.log(`   Expected USDT deduction: ${expectedUsdtSpent} USDT`);

		// 3. Call the addTransaction endpoint (using tRPC batch format)
		const addTxResponse = await fetch(`${API_URL}/crypto.addTransaction?batch=1`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				"0": testTransaction
			}),
		});

		if (!addTxResponse.ok) {
			const error = await addTxResponse.text();
			throw new Error(`API call failed: ${error}`);
		}

		const txResult = await addTxResponse.json();
		console.log(`   Transaction created: ID ${txResult[0].result.data.id}`);

		// 4. Verify the USDT balance was reduced
		const updatedDashboard = await fetch(`${API_URL}/crypto.getDashboardData?batch=1&input=%7B%7D`);
		const updatedData = await updatedDashboard.json();

		const updatedUsdtAsset = updatedData[0].result.data.assets.find((a: any) => a.asset.symbol === "USDT");
		const finalBalance = updatedUsdtAsset?.totalQuantity || 0;
		const actualDeduction = initialBalance - finalBalance;

		// 5. Check that BTC shows no cash investment
		const btcAsset = updatedData[0].result.data.assets.find((a: any) => a.asset.symbol === "BTC");
		const btcCashInvested = btcAsset?.totalInvested || 0;

		console.log("\n✅ API Integration Results:");
		console.log(`   USDT balance after: ${finalBalance.toFixed(2)} USDT`);
		console.log(`   Actual USDT deducted: ${actualDeduction.toFixed(2)} USDT`);
		console.log(`   BTC cash invested: $${btcCashInvested.toFixed(2)}`);

		// Validate results
		const deductionCorrect = Math.abs(actualDeduction - expectedUsdtSpent) < 0.01;
		const noCashInvested = btcCashInvested === 0;

		if (!deductionCorrect) {
			console.error(`❌ USDT deduction mismatch! Expected ${expectedUsdtSpent}, got ${actualDeduction}`);
		}
		if (!noCashInvested) {
			console.error(`❌ BTC should show $0 cash invested, but shows $${btcCashInvested}`);
		}

		if (deductionCorrect && noCashInvested) {
			console.log("\n🎉 API integration validated successfully!");
			console.log("   ✓ USDT payment source works through API");
			console.log("   ✓ Balance deductions are accurate");
			console.log("   ✓ Cash investment tracking is correct\n");
			process.exit(0);
		} else {
			process.exit(1);
		}

	} catch (error) {
		console.error("❌ API validation failed:", error);
		console.log("\n⚠️  Make sure the server is running on port 3003");
		process.exit(1);
	}
}

// Run validation
validateApiIntegration();