#!/usr/bin/env -S bun

/**
 * Migration script to sync existing P2P USDT transactions to crypto portfolio
 * This ensures all historical P2P USDT transactions appear in the unified portfolio
 *
 * Run from project root: bun run apps/server/src/scripts/migrate-p2p.ts
 */

async function migrateP2PToCrypto() {
	console.log("🚀 Starting P2P to Crypto migration...");

	try {
		// Step 1: Get all existing P2P USDT transactions
		const p2pTransactions = await db
			.select()
			.from(p2pTransaction)
			.where(eq(p2pTransaction.crypto, "USDT"));

		console.log(`📊 Found ${p2pTransactions.length} P2P USDT transactions to migrate`);

		if (p2pTransactions.length === 0) {
			console.log("✅ No P2P USDT transactions to migrate");
			return;
		}

		// Step 2: Ensure USDT asset exists
		let usdtAsset = await db
			.select()
			.from(cryptoAsset)
			.where(eq(cryptoAsset.symbol, "USDT"))
			.limit(1);

		if (usdtAsset.length === 0) {
			console.log("📝 Creating USDT asset...");
			const [newAsset] = await db
				.insert(cryptoAsset)
				.values({
					symbol: "USDT",
					name: "Tether",
				})
				.returning();
			usdtAsset = [newAsset];
			console.log("✅ USDT asset created");
		} else {
			console.log("✅ USDT asset already exists");
		}

		const assetId = usdtAsset[0].id;

		// Step 3: Check for existing crypto transactions to avoid duplicates
		const existingCryptoTxs = await db
			.select()
			.from(cryptoTransaction)
			.where(
				and(
					eq(cryptoTransaction.assetId, assetId),
					sql`${cryptoTransaction.exchange} LIKE 'P2P-%'`
				)
			);

		console.log(`📌 Found ${existingCryptoTxs.length} existing P2P crypto transactions`);

		// Step 4: Migrate each P2P transaction
		let migratedCount = 0;
		let skippedCount = 0;

		for (const p2pTx of p2pTransactions) {
			// Check if this transaction already exists in crypto
			const exists = existingCryptoTxs.some(cryptoTx => {
				const txDate = new Date(cryptoTx.transactionDate).toDateString();
				const p2pDate = new Date(p2pTx.transactionDate).toDateString();
				return (
					txDate === p2pDate &&
					Math.abs(cryptoTx.quantity - p2pTx.cryptoAmount) < 0.01 &&
					cryptoTx.type === p2pTx.type
				);
			});

			if (exists) {
				console.log(`⏭️  Skipping transaction from ${new Date(p2pTx.transactionDate).toLocaleDateString()} - already migrated`);
				skippedCount++;
				continue;
			}

			// Convert VND values to USD
			const pricePerUnitUSD = 1.0; // USDT is pegged to 1 USD
			const totalAmountUSD = p2pTx.cryptoAmount * pricePerUnitUSD;
			const feeInUSD = p2pTx.feeAmount ? p2pTx.feeAmount / p2pTx.exchangeRate : 0;

			// Create crypto transaction
			await db.insert(cryptoTransaction).values({
				assetId,
				type: p2pTx.type,
				quantity: p2pTx.cryptoAmount,
				pricePerUnit: pricePerUnitUSD,
				totalAmount: totalAmountUSD,
				fee: feeInUSD,
				feeInCrypto: 0,
				exchange: `P2P-${p2pTx.platform || 'Direct'}`,
				notes: `P2P ${p2pTx.type} at ${p2pTx.exchangeRate.toFixed(0)} VND/USDT${p2pTx.notes ? ` - ${p2pTx.notes}` : ''} [Migrated]`,
				transactionDate: new Date(p2pTx.transactionDate),
			});

			console.log(`✅ Migrated ${p2pTx.type} transaction from ${new Date(p2pTx.transactionDate).toLocaleDateString()}: ${p2pTx.cryptoAmount} USDT`);
			migratedCount++;
		}

		console.log("\n📊 Migration Summary:");
		console.log(`✅ Successfully migrated: ${migratedCount} transactions`);
		console.log(`⏭️  Skipped (already exists): ${skippedCount} transactions`);
		console.log(`📈 Total P2P USDT transactions: ${p2pTransactions.length}`);

		// Step 5: Verify the migration
		const totalCryptoUSDT = await db
			.select({
				count: sql<number>`COUNT(*)`,
				totalQuantity: sql<number>`SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END)`,
			})
			.from(cryptoTransaction)
			.where(eq(cryptoTransaction.assetId, assetId));

		console.log("\n🔍 Verification:");
		console.log(`📊 Total USDT transactions in crypto: ${totalCryptoUSDT[0].count}`);
		console.log(`💰 Total USDT balance: ${totalCryptoUSDT[0].totalQuantity?.toFixed(2) || 0} USDT`);

	} catch (error) {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	}

	console.log("\n✨ Migration completed successfully!");
	process.exit(0);
}

// Run the migration
migrateP2PToCrypto();