import { db } from "./src/db";
import { cryptoAsset, cryptoTransaction } from "./src/db/schema/crypto";
import { eq, and, ne, sql } from "drizzle-orm";

async function migrateUsdtPayments() {
	console.log("Starting USDT payment migration...");

	// First, find the USDT asset
	const usdtAssets = await db
		.select()
		.from(cryptoAsset)
		.where(eq(cryptoAsset.symbol, "USDT"))
		.limit(1);

	if (!usdtAssets[0]) {
		console.error("USDT asset not found!");
		return;
	}

	const usdtAssetId = usdtAssets[0].id;
	console.log(`Found USDT asset with ID: ${usdtAssetId}`);

	// Get all non-USDT buy transactions
	const buyTransactions = await db
		.select({
			transaction: cryptoTransaction,
			asset: cryptoAsset,
		})
		.from(cryptoTransaction)
		.innerJoin(cryptoAsset, eq(cryptoTransaction.assetId, cryptoAsset.id))
		.where(
			and(
				ne(cryptoAsset.symbol, "USDT"),
				eq(cryptoTransaction.type, "buy")
			)
		);

	console.log(`Found ${buyTransactions.length} non-USDT buy transactions to migrate`);

	let migratedCount = 0;
	let errorCount = 0;

	for (const { transaction, asset } of buyTransactions) {
		try {
			// Calculate the USDT amount that should have been spent
			const usdtAmountSpent = transaction.totalAmount + (transaction.fee || 0);

			console.log(
				`Processing: ${transaction.quantity} ${asset.symbol} bought for ${usdtAmountSpent} USDT`
			);

			// Start a transaction
			await db.transaction(async (tx) => {
				// 1. Create a USDT sell transaction for the amount spent
				await tx.insert(cryptoTransaction).values({
					assetId: usdtAssetId,
					type: "sell",
					quantity: usdtAmountSpent,
					pricePerUnit: 1.0,
					totalAmount: usdtAmountSpent,
					fee: 0,
					feeCurrency: "USD",
					exchange: transaction.exchange || "Internal",
					notes: `USDT used to buy ${transaction.quantity} ${asset.symbol} at $${transaction.pricePerUnit}/unit`,
					transactionDate: transaction.transactionDate,
					userId: transaction.userId,
				});

				// 2. Update the original transaction to set totalAmount and fee to 0
				// (since it was paid with USDT, not cash)
				await tx
					.update(cryptoTransaction)
					.set({
						totalAmount: 0,
						fee: 0,
						notes: sql`COALESCE(${cryptoTransaction.notes}, '') || ' [Migrated: Paid with USDT]'`,
						updatedAt: new Date(),
					})
					.where(eq(cryptoTransaction.id, transaction.id));
			});

			migratedCount++;
			console.log(`✓ Migrated transaction ID ${transaction.id}`);
		} catch (error) {
			console.error(`✗ Error migrating transaction ID ${transaction.id}:`, error);
			errorCount++;
		}
	}

	console.log("\n=== Migration Summary ===");
	console.log(`Total transactions found: ${buyTransactions.length}`);
	console.log(`Successfully migrated: ${migratedCount}`);
	console.log(`Errors: ${errorCount}`);

	// Verify the migration by checking balances
	const usdtBalance = await db
		.select({
			totalQuantity: sql<number>`
				SUM(
					CASE
						WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.quantity}
						WHEN ${cryptoTransaction.type} = 'sell' THEN -${cryptoTransaction.quantity}
						ELSE 0
					END
				)`,
		})
		.from(cryptoTransaction)
		.where(eq(cryptoTransaction.assetId, usdtAssetId));

	const totalInvestedInOthers = await db
		.select({
			totalInvested: sql<number>`
				SUM(${cryptoTransaction.totalAmount} + COALESCE(${cryptoTransaction.fee}, 0))
			`,
		})
		.from(cryptoTransaction)
		.innerJoin(cryptoAsset, eq(cryptoTransaction.assetId, cryptoAsset.id))
		.where(
			and(
				ne(cryptoAsset.symbol, "USDT"),
				eq(cryptoTransaction.type, "buy")
			)
		);

	console.log("\n=== Post-Migration Balances ===");
	console.log(`USDT Balance: ${usdtBalance[0]?.totalQuantity?.toFixed(2) || 0} USDT`);
	console.log(`Total Invested in Other Cryptos (should be 0): $${totalInvestedInOthers[0]?.totalInvested?.toFixed(2) || 0}`);
}

// Run the migration
migrateUsdtPayments()
	.then(() => {
		console.log("\nMigration completed!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\nMigration failed:", error);
		process.exit(1);
	});