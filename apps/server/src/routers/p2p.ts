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
	feeAmount: z.number().optional(),
	feePercent: z.number().optional(),
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
		.mutation(async ({ input, ctx }) => {
			// Import crypto schema
			const { cryptoAsset, cryptoTransaction } = await import("../db/schema/crypto");

			// Validate that crypto amount matches the calculation
			const calculatedCryptoAmount = input.fiatAmount / input.exchangeRate;
			const difference = Math.abs(calculatedCryptoAmount - input.cryptoAmount);
			const tolerance = 0.01; // Allow 0.01 USDT tolerance for rounding

			if (difference > tolerance) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Crypto amount (${input.cryptoAmount}) doesn't match calculation (${calculatedCryptoAmount.toFixed(4)}). Difference: ${difference.toFixed(4)} USDT`,
				});
			}

			// Get latest market rate for spread calculation
			const latestMarketRate = await db
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

			let spreadPercent: number | null = null;
			let currentMarketRate: number | null = null;

			if (latestMarketRate[0]) {
				currentMarketRate = latestMarketRate[0].rate;
				// Calculate spread as percentage difference from market rate
				// Positive spread means paying more than market (for buys) or receiving less (for sells)
				if (input.type === "buy") {
					spreadPercent = ((input.exchangeRate - currentMarketRate) / currentMarketRate) * 100;
				} else {
					spreadPercent = ((currentMarketRate - input.exchangeRate) / currentMarketRate) * 100;
				}
			}

			// Calculate fee if provided as percentage
			let feeAmount = input.feeAmount || null;
			if (input.feePercent && !feeAmount) {
				feeAmount = (input.fiatAmount * input.feePercent) / 100;
			}

			const result = await db
				.insert(p2pTransaction)
				.values({
					...input,
					cryptoAmount: calculatedCryptoAmount, // Use calculated amount to ensure accuracy
					marketRate: currentMarketRate,
					spreadPercent,
					feeAmount,
					feePercent: input.feePercent,
					transactionDate: input.transactionDate,
				})
				.returning();

			// Only sync USDT transactions to crypto portfolio
			if (input.crypto === "USDT") {
				// Check if USDT asset exists, create if not
				let usdtAsset = await db
					.select()
					.from(cryptoAsset)
					.where(eq(cryptoAsset.symbol, "USDT"))
					.limit(1);

				if (usdtAsset.length === 0) {
					// Create USDT asset
					const [newAsset] = await db
						.insert(cryptoAsset)
						.values({
							symbol: "USDT",
							name: "Tether",
							userId: ctx.session?.user?.id,
						})
						.returning();
					usdtAsset = [newAsset];
				}

				// Convert VND to USD for the crypto transaction
				// P2P rate is in VND, we need USD price per unit
				const pricePerUnitUSD = 1.0; // USDT is pegged to 1 USD
				const totalAmountUSD = calculatedCryptoAmount * pricePerUnitUSD;

				// Calculate fee in USD (if fee exists, convert from VND)
				const feeInUSD = feeAmount ? feeAmount / input.exchangeRate : 0;

				// Create corresponding crypto transaction
				await db
					.insert(cryptoTransaction)
					.values({
						assetId: usdtAsset[0].id,
						type: input.type, // 'buy' or 'sell'
						quantity: calculatedCryptoAmount,
						pricePerUnit: pricePerUnitUSD,
						totalAmount: totalAmountUSD,
						fee: feeInUSD,
						feeInCrypto: 0, // P2P fees are in fiat
						exchange: `P2P-${input.platform || 'Direct'}`,
						notes: `P2P ${input.type} at ${input.exchangeRate.toFixed(0)} VND/USDT${input.notes ? ` - ${input.notes}` : ''}`,
						transactionDate: new Date(input.transactionDate),
					});
			}

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
			// Import crypto schema
			const { cryptoTransaction } = await import("../db/schema/crypto");

			// First get the transaction to check if it's USDT
			const txToDelete = await db
				.select()
				.from(p2pTransaction)
				.where(eq(p2pTransaction.id, input.id))
				.limit(1);

			if (txToDelete.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "P2P transaction not found",
				});
			}

			// Delete the P2P transaction
			const result = await db
				.delete(p2pTransaction)
				.where(eq(p2pTransaction.id, input.id))
				.returning();

			// If it was a USDT transaction, also delete the corresponding crypto transaction
			if (txToDelete[0].crypto === "USDT") {
				// Find and delete crypto transaction by matching exchange prefix and date
				const transactionDate = new Date(txToDelete[0].transactionDate);
				await db
					.delete(cryptoTransaction)
					.where(
						and(
							sql`${cryptoTransaction.exchange} LIKE 'P2P-%'`,
							sql`DATE(${cryptoTransaction.transactionDate}) = DATE(${transactionDate})`,
							sql`ABS(${cryptoTransaction.quantity} - ${txToDelete[0].cryptoAmount}) < 0.01`
						)
					);
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
			// Helper functions for formatted logging
			const fmt2 = (n: number | null | undefined) =>
				Number(n ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
			const fmtPct = (n: number | null | undefined) =>
				`${fmt2(n ?? 0)}%`;

			// Debug logging enabled in development or with DEBUG_P2P_CALC=1
			const DEBUG = process.env.DEBUG_P2P_CALC === '1' || process.env.NODE_ENV !== 'production';

			if (DEBUG) {
				console.group(`[P2P][Server] getPortfolioSummary - ${input.crypto}/${input.fiatCurrency}`);
				console.log('Inputs:', input);
			}

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

			if (DEBUG) {
				console.log('Fetched transactions count:', transactions.length);
				console.log('Latest market rate record:', latestRate[0] ?? null);
				console.log(`Current market rate (${input.fiatCurrency}/${input.crypto}):`, fmt2(currentMarketRate));
			
				// Warn about missing market rate
				if (!latestRate[0]) {
					console.warn('⚠️ No market rate found -> currentMarketRate = 0.00; Current value and PnL will be 0.00 or misleading.');
				}
			}

			// Calculate portfolio metrics
			let totalBought = 0;
			let totalSold = 0;
			let totalFiatSpent = 0;
			let totalFiatReceived = 0;
			let totalFees = 0;
			let totalSpread = 0;
			let weightedAverageRate = 0;
			let buyTransactions: typeof transactions = [];
			let sellTransactions: typeof transactions = [];

			for (const tx of transactions) {
				if (DEBUG) {
					console.group(`[Tx ${tx.id}] ${tx.type.toUpperCase()} - ${tx.crypto}/${tx.fiatCurrency} @ ${fmt2(tx.exchangeRate)} (${new Date(tx.transactionDate).toISOString()})`);
					console.log('Amounts:', {
						cryptoAmount: `${fmt2(tx.cryptoAmount)} ${tx.crypto}`,
						fiatAmount: `${fmt2(tx.fiatAmount)} ${tx.fiatCurrency}`,
						feeAmount: `${fmt2(tx.feeAmount || 0)} ${tx.fiatCurrency}`,
					});
				}

				// Add fees to total
				if (tx.feeAmount) {
					totalFees += tx.feeAmount;
				}

				// Calculate spread cost if market rate was available
				if (tx.marketRate && tx.spreadPercent) {
					const spreadCost = Math.abs(tx.cryptoAmount * (tx.exchangeRate - tx.marketRate));
					totalSpread += spreadCost;
					
					if (DEBUG) {
						console.log('Market/Spread:', {
							marketRate: `${fmt2(tx.marketRate)} ${tx.fiatCurrency}/${tx.crypto}`,
							spreadPercent: tx.spreadPercent != null ? fmtPct(tx.spreadPercent) : 'n/a',
							spreadCostAbs: fmt2(spreadCost),
						});
					}
				} else if (DEBUG) {
					console.warn('⚠️ No marketRate captured for this transaction -> spread not computed');
				}

				if (tx.type === "buy") {
					if (DEBUG) {
						console.log(`[BUY] Add to totals: totalBought += ${fmt2(tx.cryptoAmount)}, totalFiatSpent += ${fmt2(tx.fiatAmount)} + fee ${fmt2(tx.feeAmount || 0)}`);
					}
					totalBought += tx.cryptoAmount;
					totalFiatSpent += tx.fiatAmount + (tx.feeAmount || 0); // Include fees in total spent
					buyTransactions.push(tx);
				} else {
					if (DEBUG) {
						console.log(`[SELL] Add to totals: totalSold += ${fmt2(tx.cryptoAmount)}, totalFiatReceived += ${fmt2(tx.fiatAmount)} - fee ${fmt2(tx.feeAmount || 0)}`);
					}
					totalSold += tx.cryptoAmount;
					totalFiatReceived += tx.fiatAmount - (tx.feeAmount || 0); // Deduct fees from received
					sellTransactions.push(tx);
				}

				if (DEBUG) {
					console.groupEnd();
				}
			}

			if (DEBUG) {
				console.group('[Totals]');
				console.log(`totalBought (Σ buys cryptoAmount): ${fmt2(totalBought)} ${input.crypto}`);
				console.log(`totalSold (Σ sells cryptoAmount): ${fmt2(totalSold)} ${input.crypto}`);
				console.log(`totalFiatSpent (buys + fees): ${fmt2(totalFiatSpent)} ${input.fiatCurrency}`);
				console.log(`totalFiatReceived (sells - fees): ${fmt2(totalFiatReceived)} ${input.fiatCurrency}`);
				console.log(`totalFees (Σ fees): ${fmt2(totalFees)} ${input.fiatCurrency}`);
				console.log(`totalSpread (Σ abs(cryptoAmount * (exchangeRate - marketRate))): ${fmt2(totalSpread)} ${input.fiatCurrency}`);
				console.groupEnd();
			}

			// Calculate weighted average exchange rate for buys
			if (totalBought > 0) {
				weightedAverageRate = totalFiatSpent / totalBought;
				if (DEBUG) {
					console.group('[Weighted Average]');
					console.log(`weightedAverageRate = totalFiatSpent / totalBought = ${fmt2(totalFiatSpent)} / ${fmt2(totalBought)} = ${fmt2(weightedAverageRate)} ${input.fiatCurrency}/${input.crypto}`);
					console.groupEnd();
				}
			} else if (DEBUG) {
				console.warn('⚠️ weightedAverageRate undefined: no buy transactions -> defaulting to 0.00');
			}

			// Validate weighted average rate
			if (Number.isNaN(weightedAverageRate)) {
				if (DEBUG) console.error('❌ weightedAverageRate is NaN -> division by zero; set to 0.00');
				weightedAverageRate = 0;
			}

			const currentHoldings = totalBought - totalSold;
			const currentValue = currentHoldings * currentMarketRate;
			const costBasis = currentHoldings * weightedAverageRate;
			const unrealizedPnL = currentValue - costBasis;
			const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

			if (DEBUG) {
				console.group('[Holdings & Valuation]');
				console.log(`currentHoldings = totalBought - totalSold = ${fmt2(totalBought)} - ${fmt2(totalSold)} = ${fmt2(currentHoldings)} ${input.crypto}`);
				console.log(`currentValue (${input.fiatCurrency}) = currentHoldings * currentMarketRate = ${fmt2(currentHoldings)} * ${fmt2(currentMarketRate)} = ${fmt2(currentValue)} ${input.fiatCurrency}`);
				console.log(`costBasis (${input.fiatCurrency}) = currentHoldings * weightedAverageRate = ${fmt2(currentHoldings)} * ${fmt2(weightedAverageRate)} = ${fmt2(costBasis)} ${input.fiatCurrency}`);
				console.log(`unrealizedPnL (${input.fiatCurrency}) = currentValue - costBasis = ${fmt2(currentValue)} - ${fmt2(costBasis)} = ${fmt2(unrealizedPnL)} ${input.fiatCurrency}`);
				console.log(`unrealizedPnLPercent = unrealizedPnL / costBasis = ${fmt2(unrealizedPnL)} / ${fmt2(costBasis)} = ${fmt2(unrealizedPnLPercent)}%`);
				console.groupEnd();

				// Edge case warnings
				if (totalBought === 0 && totalSold > 0) {
					console.warn(`⚠️ Sold without any recorded buys -> weightedAverageRate = 0.00; realized PnL may be inflated.`);
				}
				if (currentHoldings < 0) {
					console.warn(`⚠️ Negative holdings (${fmt2(currentHoldings)}) -> More sold than bought. Check data consistency.`);
				}
			}

			// Calculate realized P&L from sell transactions
			let realizedPnL = 0;
			if (sellTransactions.length > 0 && weightedAverageRate > 0) {
				if (DEBUG) {
					console.group('[Realized PnL]');
				}
				for (const sellTx of sellTransactions) {
					const costOfSold = sellTx.cryptoAmount * weightedAverageRate;
					const proceeds = sellTx.fiatAmount;
					realizedPnL += proceeds - costOfSold;
					
					if (DEBUG) {
						const proceedsNet = sellTx.fiatAmount - (sellTx.feeAmount || 0);
						console.log(`Sell Tx ${sellTx.id}: costOfSold = ${fmt2(sellTx.cryptoAmount)} * ${fmt2(weightedAverageRate)} = ${fmt2(costOfSold)}, proceedsGross = ${fmt2(proceeds)}, proceedsNet = ${fmt2(proceedsNet)}`);
					}
				}
				if (DEBUG) {
					console.warn('⚠️ Note: realizedPnL currently uses gross proceeds (no fee deduction). Consider using net for more accuracy.');
					console.groupEnd();
				}
			}
			
			if (DEBUG) {
				console.log(`realizedPnL (Σ(proceedsGross - costOfSold)): ${fmt2(realizedPnL)} ${input.fiatCurrency}`);
			}

			if (DEBUG) {
				console.group('[Final Summary - Four Key Numbers]');
				console.log('🔢 Four key numbers:');
				console.log('');
				console.log(`1️⃣  Tổng Đầu Tư USDT (Total Investment)`);
				console.log(`    ✅ totalBought = ${fmt2(totalBought)} USDT`);
				console.log('');
				console.log(`📊 Số dư hiện tại (Current Holdings)`);
				console.log(`    Formula: currentHoldings = totalBought - totalSold`);
				console.log(`    Calculation: ${fmt2(totalBought)} - ${fmt2(totalSold)} = ${fmt2(currentHoldings)} USDT`);
				console.log(`    ✅ Số dư hiện tại = ${fmt2(currentHoldings)} USDT`);
				if (totalSold > 0) {
					const percentSold = (totalSold / totalBought) * 100;
					console.log(`    ℹ️ Đã bán: ${fmt2(totalSold)} USDT (${fmt2(percentSold)}% của tổng đầu tư)`);
				} else {
					console.log(`    ℹ️ Chưa có giao dịch bán nào`);
				}
				console.log('');
				console.log(`2️⃣  Giá Mua Trung Bình (Avg Buy Price): ${fmt2(weightedAverageRate)} VND/USDT`);
				console.log(`3️⃣  Giá Trị Hiện Tại VNĐ (Current Value): ${fmt2(currentValue)} VND`);
				console.log(`4️⃣  Lãi/Lỗ (Nếu Bán Ngay) (P/L if sold now): ${unrealizedPnL >= 0 ? '+' : ''}${fmt2(unrealizedPnL)} VND`);
				console.log('──────────────────────────────');
				console.log('All metrics:', {
					totalBought: fmt2(totalBought),
					totalSold: fmt2(totalSold),
					currentHoldings: fmt2(currentHoldings),
					weightedAverageRate: fmt2(weightedAverageRate),
					currentMarketRate: fmt2(currentMarketRate),
					currentValue: fmt2(currentValue),
					costBasis: fmt2(costBasis),
					unrealizedPnL: fmt2(unrealizedPnL),
					unrealizedPnLPercent: fmt2(unrealizedPnLPercent),
					realizedPnL: fmt2(realizedPnL),
					totalPnL: fmt2(unrealizedPnL + realizedPnL),
					netInvested: fmt2(totalFiatSpent - totalFiatReceived),
				});
				console.groupEnd();
				console.groupEnd(); // End main [P2P][Server] group
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
					totalFees,
					totalSpread,
					weightedAverageRate,
					currentMarketRate,
					currentValue,
					costBasis,
					unrealizedPnL,
					unrealizedPnLPercent,
					realizedPnL,
					totalPnL: unrealizedPnL + realizedPnL,
					netInvested: totalFiatSpent - totalFiatReceived,
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