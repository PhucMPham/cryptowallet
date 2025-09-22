import z from "zod";
import { router, publicProcedure, protectedProcedure } from "../lib/trpc";
import { cryptoAsset, cryptoTransaction } from "../db/schema/crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { priceService } from "../services/priceService";

export const cryptoRouter = router({
	// Get all assets for user
	getAssets: publicProcedure.query(async ({ ctx }) => {
		const assets = await db
			.select({
				asset: cryptoAsset,
				totalQuantity: sql<number>`
					COALESCE(SUM(
						CASE
							WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.quantity}
							WHEN ${cryptoTransaction.type} = 'sell' THEN -${cryptoTransaction.quantity}
							ELSE 0
						END
					), 0)`.as("total_quantity"),
				totalInvested: sql<number>`
					COALESCE(SUM(
						CASE
							WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.totalAmount} + COALESCE(${cryptoTransaction.fee}, 0)
							ELSE 0
						END
					), 0)`.as("total_invested"),
				totalSold: sql<number>`
					COALESCE(SUM(
						CASE
							WHEN ${cryptoTransaction.type} = 'sell' THEN ${cryptoTransaction.totalAmount} - COALESCE(${cryptoTransaction.fee}, 0)
							ELSE 0
						END
					), 0)`.as("total_sold"),
				avgBuyPrice: sql<number>`
					CASE
						WHEN SUM(CASE WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.quantity} ELSE 0 END) > 0
						THEN SUM(CASE WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.totalAmount} ELSE 0 END) /
							 SUM(CASE WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.quantity} ELSE 0 END)
						ELSE 0
					END`.as("avg_buy_price"),
				transactionCount: sql<number>`COUNT(${cryptoTransaction.id})`.as("transaction_count"),
			})
			.from(cryptoAsset)
			.leftJoin(cryptoTransaction, eq(cryptoAsset.id, cryptoTransaction.assetId))
			.groupBy(cryptoAsset.id)
			.orderBy(desc(cryptoAsset.createdAt));

		return assets;
	}),

	// Get single asset with all transactions
	getAssetDetails: publicProcedure
		.input(z.object({ assetId: z.number() }))
		.query(async ({ input }) => {
			const asset = await db
				.select()
				.from(cryptoAsset)
				.where(eq(cryptoAsset.id, input.assetId))
				.limit(1);

			if (!asset[0]) {
				throw new Error("Asset not found");
			}

			const transactions = await db
				.select()
				.from(cryptoTransaction)
				.where(eq(cryptoTransaction.assetId, input.assetId))
				.orderBy(desc(cryptoTransaction.transactionDate));

			// Calculate DCA and summary
			const buyTransactions = transactions.filter((t) => t.type === "buy");
			const sellTransactions = transactions.filter((t) => t.type === "sell");

			const totalBought = buyTransactions.reduce((sum, t) => sum + t.quantity, 0);
			const totalSold = sellTransactions.reduce((sum, t) => sum + t.quantity, 0);
			const totalInvested = buyTransactions.reduce(
				(sum, t) => sum + t.totalAmount + (t.fee || 0),
				0
			);
			const totalRevenue = sellTransactions.reduce(
				(sum, t) => sum + t.totalAmount - (t.fee || 0),
				0
			);
			const currentHoldings = totalBought - totalSold;
			const avgBuyPrice = totalBought > 0 ? totalInvested / totalBought : 0;

			return {
				asset: asset[0],
				transactions,
				summary: {
					totalBought,
					totalSold,
					currentHoldings,
					totalInvested,
					totalRevenue,
					avgBuyPrice,
					realizedPL: totalRevenue - (totalSold * avgBuyPrice),
				},
			};
		}),

	// Create new asset
	createAsset: publicProcedure
		.input(
			z.object({
				symbol: z.string().min(1).max(10).toUpperCase(),
				name: z.string().min(1).max(100),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Check if asset already exists
			const existing = await db
				.select()
				.from(cryptoAsset)
				.where(eq(cryptoAsset.symbol, input.symbol))
				.limit(1);

			if (existing[0]) {
				return existing[0];
			}

			const [newAsset] = await db
				.insert(cryptoAsset)
				.values({
					symbol: input.symbol,
					name: input.name,
					userId: ctx.session?.user?.id,
				})
				.returning();

			return newAsset;
		}),

	// Add transaction
	addTransaction: publicProcedure
		.input(
			z.object({
				assetId: z.number().optional(),
				symbol: z.string().min(1).max(10).toUpperCase(),
				name: z.string().min(1).max(100).optional(),
				type: z.enum(["buy", "sell"]),
				quantity: z.number().positive(),
				pricePerUnit: z.number().positive(),
				fee: z.number().min(0).optional(),
				feeCurrency: z.enum(["USD", "CRYPTO"]).optional().default("USD"),
				exchange: z.string().optional(),
				notes: z.string().optional(),
				transactionDate: z.date().or(z.string()),
			})
		)
		.mutation(async ({ input, ctx }) => {
			let assetId = input.assetId;

			// Create asset if not provided
			if (!assetId) {
				const existing = await db
					.select()
					.from(cryptoAsset)
					.where(eq(cryptoAsset.symbol, input.symbol))
					.limit(1);

				if (existing[0]) {
					assetId = existing[0].id;
				} else {
					const [newAsset] = await db
						.insert(cryptoAsset)
						.values({
							symbol: input.symbol,
							name: input.name || input.symbol,
							userId: ctx.session?.user?.id,
						})
						.returning();
					assetId = newAsset.id;
				}
			}

			const totalAmount = input.quantity * input.pricePerUnit;
			const transactionDate = typeof input.transactionDate === "string"
				? new Date(input.transactionDate)
				: input.transactionDate;

			// Handle fee currency conversion
			let feeInUSD = input.fee || 0;
			let feeInCrypto: number | undefined = undefined;

			if (input.fee && input.feeCurrency === "CRYPTO") {
				// Fee is provided in crypto, convert to USD
				feeInCrypto = input.fee;
				feeInUSD = input.fee * input.pricePerUnit; // Convert crypto fee to USD using transaction price
			}

			const [transaction] = await db
				.insert(cryptoTransaction)
				.values({
					assetId,
					type: input.type,
					quantity: input.quantity,
					pricePerUnit: input.pricePerUnit,
					totalAmount,
					fee: feeInUSD,
					feeCurrency: input.feeCurrency || "USD",
					feeInCrypto,
					exchange: input.exchange,
					notes: input.notes,
					transactionDate,
					userId: ctx.session?.user?.id,
				})
				.returning();

			return transaction;
		}),

	// Update transaction
	updateTransaction: publicProcedure
		.input(
			z.object({
				id: z.number(),
				type: z.enum(["buy", "sell"]).optional(),
				quantity: z.number().positive().optional(),
				pricePerUnit: z.number().positive().optional(),
				fee: z.number().min(0).optional(),
				feeCurrency: z.enum(["USD", "CRYPTO"]).optional(),
				exchange: z.string().optional(),
				notes: z.string().optional(),
				transactionDate: z.date().or(z.string()).optional(),
			})
		)
		.mutation(async ({ input }) => {
			const { id, ...updateData } = input;

			// Fetch existing transaction
			const [existing] = await db
				.select()
				.from(cryptoTransaction)
				.where(eq(cryptoTransaction.id, id))
				.limit(1);

			if (!existing) {
				throw new Error("Transaction not found");
			}

			// Calculate new totalAmount if quantity or price changed
			if (updateData.quantity !== undefined || updateData.pricePerUnit !== undefined) {
				const quantity = updateData.quantity ?? existing.quantity;
				const pricePerUnit = updateData.pricePerUnit ?? existing.pricePerUnit;
				(updateData as any).totalAmount = quantity * pricePerUnit;
			}

			// Handle fee currency conversion
			if (updateData.fee !== undefined || updateData.feeCurrency !== undefined) {
				const feeCurrency = updateData.feeCurrency ?? existing.feeCurrency ?? "USD";
				const pricePerUnit = updateData.pricePerUnit ?? existing.pricePerUnit;

				if (feeCurrency === "CRYPTO" && updateData.fee !== undefined) {
					// Fee is in crypto, convert to USD
					(updateData as any).feeInCrypto = updateData.fee;
					(updateData as any).fee = updateData.fee * pricePerUnit;
				} else if (feeCurrency === "USD") {
					// Fee is already in USD
					(updateData as any).feeInCrypto = null;
				}
			}

			if (updateData.transactionDate && typeof updateData.transactionDate === "string") {
				(updateData as any).transactionDate = new Date(updateData.transactionDate);
			}

			(updateData as any).updatedAt = new Date();

			const [updated] = await db
				.update(cryptoTransaction)
				.set(updateData)
				.where(eq(cryptoTransaction.id, id))
				.returning();

			return updated;
		}),

	// Delete transaction
	deleteTransaction: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			await db.delete(cryptoTransaction).where(eq(cryptoTransaction.id, input.id));
			return { success: true };
		}),

	// Delete asset and all its transactions
	deleteAsset: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			await db.delete(cryptoAsset).where(eq(cryptoAsset.id, input.id));
			return { success: true };
		}),

	// Get current price for a crypto symbol
	getCurrentPrice: publicProcedure
		.input(z.object({ symbol: z.string() }))
		.query(async ({ input }) => {
			const price = await priceService.getPrice(input.symbol);
			return { symbol: input.symbol, price };
		}),

	// Get portfolio summary
	getPortfolioSummary: publicProcedure.query(async ({ ctx }) => {
		const summary = await db
			.select({
				totalInvested: sql<number>`
					COALESCE(SUM(
						CASE
							WHEN ${cryptoTransaction.type} = 'buy'
							THEN ${cryptoTransaction.totalAmount} + COALESCE(${cryptoTransaction.fee}, 0)
							ELSE 0
						END
					), 0)`,
				totalSold: sql<number>`
					COALESCE(SUM(
						CASE
							WHEN ${cryptoTransaction.type} = 'sell'
							THEN ${cryptoTransaction.totalAmount} - COALESCE(${cryptoTransaction.fee}, 0)
							ELSE 0
						END
					), 0)`,
				totalFees: sql<number>`
					COALESCE(SUM(${cryptoTransaction.fee}), 0)`,
				transactionCount: sql<number>`COUNT(*)`,
				assetCount: sql<number>`COUNT(DISTINCT ${cryptoTransaction.assetId})`,
			})
			.from(cryptoTransaction)
			.limit(1);

		return summary[0] || {
			totalInvested: 0,
			totalSold: 0,
			totalFees: 0,
			transactionCount: 0,
			assetCount: 0,
			netInvested: 0,
		};
	}),
});

export type CryptoRouter = typeof cryptoRouter;