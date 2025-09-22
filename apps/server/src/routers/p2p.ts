import { z } from "zod";
import { publicProcedure, router } from "../lib/trpc";
import { db } from "../db";
import { p2pTransaction, marketRate } from "../db/schema/p2p";
import { eq, desc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const createP2PTransactionSchema = z.object({
	type: z.enum(["buy", "sell"]),
	crypto: z.string().default("USDT"),
	cryptoAmount: z.number().positive(),
	fiatCurrency: z.string().default("VND"),
	fiatAmount: z.number().positive(),
	exchangeRate: z.number().positive(),
	platform: z.string().optional(),
	counterparty: z.string().optional(),
	paymentMethod: z.string().optional(),
	bankName: z.string().optional(),
	transactionId: z.string().optional(),
	notes: z.string().optional(),
	transactionDate: z.string().transform((str) => new Date(str)),
});

const updateMarketRateSchema = z.object({
	crypto: z.string(),
	fiatCurrency: z.string(),
	rate: z.number().positive(),
	source: z.string().optional(),
});

export const p2pRouter = router({
	// Get all P2P transactions
	getTransactions: publicProcedure
		.input(z.object({
			crypto: z.string().optional(),
			fiatCurrency: z.string().optional(),
			type: z.enum(["buy", "sell"]).optional(),
		}).optional())
		.query(async ({ input }) => {
			const conditions = [];

			if (input?.crypto) {
				conditions.push(eq(p2pTransaction.crypto, input.crypto));
			}
			if (input?.fiatCurrency) {
				conditions.push(eq(p2pTransaction.fiatCurrency, input.fiatCurrency));
			}
			if (input?.type) {
				conditions.push(eq(p2pTransaction.type, input.type));
			}

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			return await db
				.select()
				.from(p2pTransaction)
				.where(where)
				.orderBy(desc(p2pTransaction.transactionDate));
		}),

	// Get P2P transaction by ID
	getTransaction: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			const transaction = await db
				.select()
				.from(p2pTransaction)
				.where(eq(p2pTransaction.id, input.id))
				.limit(1);

			if (transaction.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "P2P transaction not found",
				});
			}

			return transaction[0];
		}),

	// Create new P2P transaction
	addTransaction: publicProcedure
		.input(createP2PTransactionSchema)
		.mutation(async ({ input }) => {
			const result = await db
				.insert(p2pTransaction)
				.values({
					...input,
					transactionDate: input.transactionDate,
				})
				.returning();

			return result[0];
		}),

	// Update P2P transaction
	updateTransaction: publicProcedure
		.input(z.object({
			id: z.number(),
			...createP2PTransactionSchema.shape,
		}))
		.mutation(async ({ input }) => {
			const { id, ...data } = input;

			const result = await db
				.update(p2pTransaction)
				.set({
					...data,
					updatedAt: new Date(),
				})
				.where(eq(p2pTransaction.id, id))
				.returning();

			if (result.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "P2P transaction not found",
				});
			}

			return result[0];
		}),

	// Delete P2P transaction
	deleteTransaction: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			const result = await db
				.delete(p2pTransaction)
				.where(eq(p2pTransaction.id, input.id))
				.returning();

			if (result.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "P2P transaction not found",
				});
			}

			return result[0];
		}),

	// Get portfolio summary with P&L calculations
	getPortfolioSummary: publicProcedure
		.input(z.object({
			crypto: z.string().default("USDT"),
			fiatCurrency: z.string().default("VND"),
		}))
		.query(async ({ input }) => {
			// Get all P2P transactions for the specified crypto/fiat pair
			const transactions = await db
				.select()
				.from(p2pTransaction)
				.where(
					and(
						eq(p2pTransaction.crypto, input.crypto),
						eq(p2pTransaction.fiatCurrency, input.fiatCurrency)
					)
				)
				.orderBy(p2pTransaction.transactionDate);

			// Get latest market rate
			const latestRate = await db
				.select()
				.from(marketRate)
				.where(
					and(
						eq(marketRate.crypto, input.crypto),
						eq(marketRate.fiatCurrency, input.fiatCurrency)
					)
				)
				.orderBy(desc(marketRate.timestamp))
				.limit(1);

			const currentMarketRate = latestRate[0]?.rate || 0;

			// Calculate portfolio metrics
			let totalBought = 0;
			let totalSold = 0;
			let totalFiatSpent = 0;
			let totalFiatReceived = 0;
			let weightedAverageRate = 0;
			let buyTransactions: typeof transactions = [];
			let sellTransactions: typeof transactions = [];

			for (const tx of transactions) {
				if (tx.type === "buy") {
					totalBought += tx.cryptoAmount;
					totalFiatSpent += tx.fiatAmount;
					buyTransactions.push(tx);
				} else {
					totalSold += tx.cryptoAmount;
					totalFiatReceived += tx.fiatAmount;
					sellTransactions.push(tx);
				}
			}

			// Calculate weighted average exchange rate for buys
			if (totalBought > 0) {
				weightedAverageRate = totalFiatSpent / totalBought;
			}

			const currentHoldings = totalBought - totalSold;
			const currentValue = currentHoldings * currentMarketRate;
			const costBasis = currentHoldings * weightedAverageRate;
			const unrealizedPnL = currentValue - costBasis;
			const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

			// Calculate realized P&L from sell transactions
			let realizedPnL = 0;
			if (sellTransactions.length > 0 && weightedAverageRate > 0) {
				for (const sellTx of sellTransactions) {
					const costOfSold = sellTx.cryptoAmount * weightedAverageRate;
					const proceeds = sellTx.fiatAmount;
					realizedPnL += proceeds - costOfSold;
				}
			}

			return {
				summary: {
					crypto: input.crypto,
					fiatCurrency: input.fiatCurrency,
					totalBought,
					totalSold,
					currentHoldings,
					totalFiatSpent,
					totalFiatReceived,
					weightedAverageRate,
					currentMarketRate,
					currentValue,
					costBasis,
					unrealizedPnL,
					unrealizedPnLPercent,
					realizedPnL,
					totalPnL: unrealizedPnL + realizedPnL,
				},
				transactions,
				latestMarketRate: latestRate[0] || null,
			};
		}),

	// Update market rate
	updateMarketRate: publicProcedure
		.input(updateMarketRateSchema)
		.mutation(async ({ input }) => {
			const result = await db
				.insert(marketRate)
				.values({
					...input,
					timestamp: new Date(),
				})
				.returning();

			return result[0];
		}),

	// Get market rate history
	getMarketRates: publicProcedure
		.input(z.object({
			crypto: z.string(),
			fiatCurrency: z.string(),
			limit: z.number().optional().default(100),
		}))
		.query(async ({ input }) => {
			return await db
				.select()
				.from(marketRate)
				.where(
					and(
						eq(marketRate.crypto, input.crypto),
						eq(marketRate.fiatCurrency, input.fiatCurrency)
					)
				)
				.orderBy(desc(marketRate.timestamp))
				.limit(input.limit);
		}),

	// Fetch current market rate from external API
	fetchCurrentRate: publicProcedure
		.input(z.object({
			crypto: z.string().default("USDT"),
			fiatCurrency: z.string().default("VND"),
		}))
		.mutation(async ({ input }) => {
			try {
				// Map crypto symbols to CoinMarketCap IDs
				const cryptoIdMap: Record<string, string> = {
					"USDT": "tether",
					"USDC": "usd-coin",
					"BTC": "bitcoin",
					"ETH": "ethereum",
				};

				const cryptoId = cryptoIdMap[input.crypto.toUpperCase()] || input.crypto.toLowerCase();

				// Fetch from CoinGecko API (free tier)
				const response = await fetch(
					`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${input.fiatCurrency.toLowerCase()}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch market rate");
				}

				const data = await response.json();
				const rate = data[cryptoId]?.[input.fiatCurrency.toLowerCase()];

				if (!rate) {
					throw new Error("Rate not found for the specified pair");
				}

				// Store the fetched rate
				const result = await db
					.insert(marketRate)
					.values({
						crypto: input.crypto,
						fiatCurrency: input.fiatCurrency,
						rate,
						source: "CoinGecko",
						timestamp: new Date(),
					})
					.returning();

				return result[0];
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to fetch market rate: ${error instanceof Error ? error.message : "Unknown error"}`,
				});
			}
		}),
});