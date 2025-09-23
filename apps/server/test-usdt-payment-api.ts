#!/usr/bin/env bun
// Test USDT payment through API directly

import { cryptoRouter } from "./src/routers/crypto";

async function testUsdtPaymentApi() {
	console.log("Testing USDT payment API directly...\n");

	// Create a mock context
	const mockCtx = {
		session: { user: { id: "test" } },
		headers: {},
	};

	// Create the router caller
	const caller = cryptoRouter.createCaller(mockCtx as any);

	try {
		// Get initial USDT balance
		const initialData = await caller.getDashboardData();
		const usdtAsset = initialData.assets.find(a => a.asset.symbol === "USDT");
		const initialBalance = usdtAsset?.totalQuantity || 0;

		console.log(`Initial USDT balance: ${initialBalance.toFixed(2)} USDT`);

		// Test transaction with USDT payment
		const testTx = {
			symbol: "TEST2",
			name: "Test Token 2",
			type: "buy" as const,
			quantity: 10,
			pricePerUnit: 5,
			fee: 0,
			feeCurrency: "USD" as const,
			paymentSource: "USDT" as const,
			exchange: "API Direct Test",
			notes: "Direct API test",
			transactionDate: new Date().toISOString(),
		};

		console.log(`\nCreating transaction: Buy ${testTx.quantity} ${testTx.symbol} at $${testTx.pricePerUnit} using ${testTx.paymentSource}`);

		// Execute the transaction
		const result = await caller.addTransaction(testTx);
		console.log(`Transaction created: ID ${result.id}`);

		// Check the updated balance
		const updatedData = await caller.getDashboardData();
		const updatedUsdtAsset = updatedData.assets.find(a => a.asset.symbol === "USDT");
		const finalBalance = updatedUsdtAsset?.totalQuantity || 0;
		const usdtUsed = initialBalance - finalBalance;

		// Check TEST2 asset
		const test2Asset = updatedData.assets.find(a => a.asset.symbol === "TEST2");
		const test2Invested = test2Asset?.totalInvested || 0;

		console.log("\nResults:");
		console.log(`  USDT balance after: ${finalBalance.toFixed(2)} USDT`);
		console.log(`  USDT used: ${usdtUsed.toFixed(2)} USDT`);
		console.log(`  TEST2 cash invested: $${test2Invested.toFixed(2)}`);

		const expectedUsdtUsed = testTx.quantity * testTx.pricePerUnit;
		if (Math.abs(usdtUsed - expectedUsdtUsed) < 0.01 && test2Invested === 0) {
			console.log("\n✅ API correctly handles USDT payment!");
		} else {
			console.log("\n❌ API not working correctly:");
			console.log(`  Expected USDT used: ${expectedUsdtUsed}`);
			console.log(`  Actual USDT used: ${usdtUsed}`);
			console.log(`  Expected cash invested: $0`);
			console.log(`  Actual cash invested: $${test2Invested}`);
		}

		// Cleanup
		const { db } = await import("./src/db");
		const { cryptoAsset, cryptoTransaction } = await import("./src/db/schema/crypto");
		const { eq } = await import("drizzle-orm");

		// Delete test transactions and asset
		if (test2Asset) {
			await db.delete(cryptoTransaction).where(eq(cryptoTransaction.assetId, test2Asset.asset.id));
			await db.delete(cryptoAsset).where(eq(cryptoAsset.id, test2Asset.asset.id));

			// Also delete the corresponding USDT sell transaction
			const recentUsdtTxs = await db
				.select()
				.from(cryptoTransaction)
				.where(eq(cryptoTransaction.exchange, "API Direct Test"));

			for (const tx of recentUsdtTxs) {
				await db.delete(cryptoTransaction).where(eq(cryptoTransaction.id, tx.id));
			}

			console.log("\n🧹 Test data cleaned up");
		}

	} catch (error) {
		console.error("Error:", error);
	}
}

testUsdtPaymentApi();