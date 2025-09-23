import z from "zod";
import { router, publicProcedure, protectedProcedure } from "../lib/trpc";
import { cryptoAsset, cryptoTransaction } from "../db/schema/crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { priceService } from "../services/priceService";
import { coinMarketCapService } from "../services/coinmarketcapService";
import { CurrencyService } from "../services/currencyService";

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

	// Get all assets with current prices
	getAssetsWithPrices: publicProcedure.query(async ({ ctx }) => {
		// CoinMarketCap IDs for common cryptocurrencies (for logo URLs)
		const cryptoIdMap: Record<string, number> = {
			BTC: 1,
			ETH: 1027,
			USDT: 825,
			BNB: 1839,
			XRP: 52,
			SOL: 5426,
			USDC: 3408,
			ADA: 2010,
			DOGE: 74,
			AVAX: 5805,
			TRX: 1958,
			DOT: 6636,
			LINK: 1975,
			MATIC: 3890,
			POLYGON: 3890, // Alias for MATIC
			POL: 3890, // New ticker for Polygon
			TON: 11419,
			ICP: 8916,
			SHIB: 5994,
			LTC: 2,
			BCH: 1831,
			UNI: 7083,
			ATOM: 3794,
			XLM: 512,
			ETC: 1321,
			FIL: 2280,
			APT: 21794,
			ARB: 11841,
			OP: 11840,
			VET: 3077,
			HBAR: 4642,
			NEAR: 6535,
			GRT: 6719,
			ALGO: 4030,
			FTM: 3513,
			SAND: 6210,
			MANA: 1966,
			AXS: 6783,
			AAVE: 7278,
			CRV: 6538,
			SUSHI: 6758,
			CAKE: 7186,
			XTZ: 2011,
		};

		// First get all assets
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

		// Get all unique symbols
		const symbols = assets.map(a => a.asset.symbol);

		// Fetch current prices in bulk
		let prices: Record<string, number | null> = {};
		if (symbols.length > 0) {
			try {
				prices = await priceService.getPrices(symbols);
			} catch (error) {
				console.error("Error fetching prices:", error);
				// Continue with null prices rather than failing the entire request
			}
		}

		// Get VND conversion rate
		const vndConversion = await CurrencyService.getUsdToVndRate();

		// Combine assets with prices and logos
		const assetsWithPrices = assets.map(item => {
			const currentPrice = prices[item.asset.symbol] || null;
			const currentValue = currentPrice && item.totalQuantity > 0
				? currentPrice * item.totalQuantity
				: 0;
			const netInvested = item.totalInvested - item.totalSold;
			const unrealizedPL = currentValue > 0 ? currentValue - netInvested : 0;
			const unrealizedPLPercent = netInvested > 0
				? (unrealizedPL / netInvested) * 100
				: 0;

			// Get logo URL from CoinMarketCap
			const cryptoId = cryptoIdMap[item.asset.symbol.toUpperCase()];
			const logoUrl = cryptoId
				? `https://s2.coinmarketcap.com/static/img/coins/64x64/${cryptoId}.png`
				: null;

			// Calculate VND values
			const currentPriceVnd = currentPrice ? currentPrice * vndConversion.usdToVnd : null;
			const currentValueVnd = currentValue * vndConversion.usdToVnd;
			const avgBuyPriceVnd = item.avgBuyPrice * vndConversion.usdToVnd;
			const unrealizedPLVnd = unrealizedPL * vndConversion.usdToVnd;
			const totalInvestedVnd = item.totalInvested * vndConversion.usdToVnd;
			const totalSoldVnd = item.totalSold * vndConversion.usdToVnd;

			return {
				...item,
				currentPrice,
				currentValue,
				unrealizedPL,
				unrealizedPLPercent,
				totalValue: currentValue, // Total value of current holdings
				logoUrl, // Add logo URL
				// VND values
				vnd: {
					currentPrice: currentPriceVnd,
					currentValue: currentValueVnd,
					avgBuyPrice: avgBuyPriceVnd,
					unrealizedPL: unrealizedPLVnd,
					totalInvested: totalInvestedVnd,
					totalSold: totalSoldVnd,
					exchangeRate: vndConversion.usdToVnd,
					source: vndConversion.source
				}
			};
		});

		return assetsWithPrices;
	}),

	// Get single asset with all transactions
	getAssetDetails: publicProcedure
		.input(z.object({ assetId: z.number() }))
		.query(async ({ input }) => {
			// CoinMarketCap IDs for logo URLs (same as above)
			const cryptoIdMap: Record<string, number> = {
				BTC: 1, ETH: 1027, USDT: 825, BNB: 1839, XRP: 52, SOL: 5426,
				USDC: 3408, ADA: 2010, DOGE: 74, AVAX: 5805, TRX: 1958,
				DOT: 6636, LINK: 1975, MATIC: 3890, POLYGON: 3890, POL: 3890,
				TON: 11419, ICP: 8916, SHIB: 5994, LTC: 2, BCH: 1831,
				UNI: 7083, ATOM: 3794, XLM: 512, ETC: 1321, FIL: 2280,
				APT: 21794, ARB: 11841, OP: 11840, VET: 3077, HBAR: 4642,
				NEAR: 6535, GRT: 6719, ALGO: 4030, FTM: 3513, SAND: 6210,
				MANA: 1966, AXS: 6783, AAVE: 7278, CRV: 6538, SUSHI: 6758,
				CAKE: 7186, XTZ: 2011,
			};

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

			// Get VND conversion rate
			const vndConversion = await CurrencyService.getUsdToVndRate();

			// Calculate VND values for transactions
			const transactionsWithVnd = transactions.map(tx => ({
				...tx,
				vnd: {
					pricePerUnit: tx.pricePerUnit * vndConversion.usdToVnd,
					totalAmount: tx.totalAmount * vndConversion.usdToVnd,
					fee: tx.fee ? tx.fee * vndConversion.usdToVnd : null
				}
			}));

			// Get logo URL from CoinMarketCap
			const cryptoId = cryptoIdMap[asset[0].symbol.toUpperCase()];
			const logoUrl = cryptoId
				? `https://s2.coinmarketcap.com/static/img/coins/64x64/${cryptoId}.png`
				: null;

			return {
				asset: {
					...asset[0],
					logoUrl
				},
				transactions: transactionsWithVnd,
				summary: {
					totalBought,
					totalSold,
					currentHoldings,
					totalInvested,
					totalRevenue,
					avgBuyPrice,
					realizedPL: totalRevenue - (totalSold * avgBuyPrice),
					// VND values
					vnd: {
						totalInvested: totalInvested * vndConversion.usdToVnd,
						totalRevenue: totalRevenue * vndConversion.usdToVnd,
						avgBuyPrice: avgBuyPrice * vndConversion.usdToVnd,
						realizedPL: (totalRevenue - (totalSold * avgBuyPrice)) * vndConversion.usdToVnd,
						netInvested: (totalInvested - totalRevenue) * vndConversion.usdToVnd,
						exchangeRate: vndConversion.usdToVnd,
						source: vndConversion.source
					}
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
				paymentSource: z.enum(["CASH", "USDT"]).optional().default("CASH"),
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

			// If buying with USDT, create a corresponding USDT sell transaction
			if (input.type === "buy" && input.paymentSource === "USDT" && input.symbol !== "USDT") {
				// Find or create USDT asset
				let usdtAsset = await db
					.select()
					.from(cryptoAsset)
					.where(eq(cryptoAsset.symbol, "USDT"))
					.limit(1);

				if (!usdtAsset[0]) {
					// Create USDT asset if it doesn't exist
					const [newUsdtAsset] = await db
						.insert(cryptoAsset)
						.values({
							symbol: "USDT",
							name: "Tether",
							userId: ctx.session?.user?.id,
						})
						.returning();
					usdtAsset = [newUsdtAsset];
				}

				// Calculate USDT amount to sell (total cost including fees)
				const usdtAmountToSell = totalAmount + feeInUSD;

				// Create USDT sell transaction
				await db
					.insert(cryptoTransaction)
					.values({
						assetId: usdtAsset[0].id,
						type: "sell",
						quantity: usdtAmountToSell,
						pricePerUnit: 1.0, // USDT is pegged to 1 USD
						totalAmount: usdtAmountToSell,
						fee: 0, // No additional fee for the USDT conversion
						feeCurrency: "USD",
						exchange: input.exchange || "Internal",
						notes: `Used USDT to buy ${input.quantity} ${input.symbol} at $${input.pricePerUnit}`,
						transactionDate,
						userId: ctx.session?.user?.id,
					});
			}

			// Create the main transaction
			const [transaction] = await db
				.insert(cryptoTransaction)
				.values({
					assetId,
					type: input.type,
					quantity: input.quantity,
					pricePerUnit: input.pricePerUnit,
					totalAmount: input.paymentSource === "USDT" ? 0 : totalAmount, // Set to 0 if paid with USDT
					fee: input.paymentSource === "USDT" ? 0 : feeInUSD, // Set to 0 if paid with USDT
					feeCurrency: input.feeCurrency || "USD",
					feeInCrypto,
					exchange: input.exchange,
					notes: input.paymentSource === "USDT"
						? `${input.notes ? input.notes + " - " : ""}Purchased with USDT`
						: input.notes,
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
				.set(updateData as any)
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

		const baseSummary = summary[0] || {
			totalInvested: 0,
			totalSold: 0,
			totalFees: 0,
			transactionCount: 0,
			assetCount: 0,
			netInvested: 0,
		};

		// Get VND conversion rate
		const vndConversion = await CurrencyService.getUsdToVndRate();

		// Add VND values
		return {
			...baseSummary,
			vnd: {
				totalInvested: baseSummary.totalInvested * vndConversion.usdToVnd,
				totalSold: baseSummary.totalSold * vndConversion.usdToVnd,
				totalFees: baseSummary.totalFees * vndConversion.usdToVnd,
				netInvested: (baseSummary.totalInvested - baseSummary.totalSold) * vndConversion.usdToVnd,
				exchangeRate: vndConversion.usdToVnd,
				source: vndConversion.source
			}
		};
	}),

	// Update VND exchange rate from P2P
	updateVndRate: publicProcedure
		.input(z.object({
			rate: z.number().positive(),
			source: z.string().optional()
		}))
		.mutation(async ({ input }) => {
			// Import marketRate if needed
			const { marketRate } = await import("../db/schema/p2p");

			// Update the USDT/VND rate in the database
			await db.insert(marketRate).values({
				crypto: "USDT",
				fiatCurrency: "VND",
				rate: input.rate,
				source: input.source || "Manual",
				timestamp: new Date(),
			});

			return {
				success: true,
				rate: input.rate,
				source: input.source || "Manual"
			};
		}),

	// Test CoinMarketCap integration
	testCoinMarketCap: publicProcedure
		.input(
			z.object({
				symbol: z.string().optional().default("BTC"),
				provider: z.enum(["coinmarketcap", "coingecko", "auto"]).optional().default("auto"),
			})
		)
		.query(async ({ input }) => {
			// Set provider if specified
			if (input.provider !== "auto") {
				priceService.setProvider(input.provider);
			}

			const results: any = {
				provider: priceService.getProviderStatus(),
				symbol: input.symbol,
				timestamp: new Date().toISOString(),
			};

			// Test single price fetch
			try {
				const price = await priceService.getPrice(input.symbol);
				results.singlePrice = {
					success: true,
					price,
					source: price ? "Price fetched successfully" : "Symbol not found or API error",
				};
			} catch (error) {
				results.singlePrice = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}

			// Test bulk price fetch
			try {
				const symbols = ["BTC", "ETH", "BNB"];
				const prices = await priceService.getPrices(symbols);
				results.bulkPrices = {
					success: true,
					prices,
					symbolsFetched: symbols.filter(s => prices[s] !== null).length,
					totalSymbols: symbols.length,
				};
			} catch (error) {
				results.bulkPrices = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}

			// Test CoinMarketCap directly if configured
			if (coinMarketCapService.isConfigured()) {
				try {
					const cmcPrice = await coinMarketCapService.getPrice(input.symbol);
					results.directCoinMarketCap = {
						success: true,
						price: cmcPrice,
						configured: true,
					};

					// Also test top cryptocurrencies
					const topCryptos = await coinMarketCapService.getTopCryptocurrencies(5);
					results.topCryptocurrencies = {
						success: true,
						count: topCryptos.length,
						data: topCryptos.map(c => ({
							symbol: c.symbol,
							name: c.name,
							price: c.quote.USD.price,
							marketCap: c.quote.USD.market_cap,
							change24h: c.quote.USD.percent_change_24h,
						})),
					};
				} catch (error) {
					results.directCoinMarketCap = {
						success: false,
						configured: true,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			} else {
				results.directCoinMarketCap = {
					success: false,
					configured: false,
					message: "CoinMarketCap API key not configured. Add COINMARKETCAP_API_KEY to .env file",
				};
			}

			return results;
		}),

	// Get price provider status
	getPriceProviderStatus: publicProcedure.query(async () => {
		const status = priceService.getProviderStatus();
		return {
			...status,
			message: status.coinMarketCapConfigured
				? "CoinMarketCap is configured and ready to use"
				: "Using CoinGecko as default. To use CoinMarketCap, add COINMARKETCAP_API_KEY to .env",
		};
	}),

	// Get recent transactions across all assets
	getRecentTransactions: publicProcedure
		.input(z.object({
			limit: z.number().optional().default(10),
		}).optional())
		.query(async ({ input }) => {
			const limit = input?.limit || 10;

			return await db
				.select({
					id: cryptoTransaction.id,
					type: cryptoTransaction.type,
					quantity: cryptoTransaction.quantity,
					pricePerUnit: cryptoTransaction.pricePerUnit,
					totalAmount: cryptoTransaction.totalAmount,
					fee: cryptoTransaction.fee,
					transactionDate: cryptoTransaction.transactionDate,
					asset: cryptoAsset,
				})
				.from(cryptoTransaction)
				.leftJoin(cryptoAsset, eq(cryptoTransaction.assetId, cryptoAsset.id))
				.orderBy(desc(cryptoTransaction.transactionDate))
				.limit(limit);
		}),

	// Optimized endpoint for dashboard - fetches portfolio and assets in parallel
	getDashboardData: publicProcedure.query(async ({ ctx }) => {
		// Execute queries in parallel for better performance
		const [assetsData, portfolioSummary, vndConversion] = await Promise.all([
			// Get assets with aggregated data
			db
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
				.orderBy(desc(cryptoAsset.createdAt)),

			// Get portfolio summary
			db
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
				.limit(1),

			// Get VND conversion rate
			CurrencyService.getUsdToVndRate(),
		]);

		// Get unique symbols for price fetching
		const symbols = assetsData.map(a => a.asset.symbol);

		// Fetch current prices
		let prices: Record<string, number | null> = {};
		if (symbols.length > 0) {
			try {
				prices = await priceService.getPrices(symbols);
			} catch (error) {
				console.error("Error fetching prices:", error);
			}
		}

		// CoinMarketCap IDs for logos
		const cryptoIdMap: Record<string, number> = {
			BTC: 1, ETH: 1027, USDT: 825, BNB: 1839, XRP: 52, SOL: 5426,
			USDC: 3408, ADA: 2010, DOGE: 74, AVAX: 5805, TRX: 1958,
			DOT: 6636, LINK: 1975, MATIC: 3890, POLYGON: 3890, POL: 3890,
			TON: 11419, ICP: 8916, SHIB: 5994, LTC: 2, BCH: 1831,
			UNI: 7083, ATOM: 3794, XLM: 512, ETC: 1321, FIL: 2280,
			APT: 21794, ARB: 11841, OP: 11840, VET: 3077, HBAR: 4642,
			NEAR: 6535, GRT: 6719, ALGO: 4030, FTM: 3513, SAND: 6210,
			MANA: 1966, AXS: 6783, AAVE: 7278, CRV: 6538, SUSHI: 6758,
			CAKE: 7186, XTZ: 2011,
		};

		// Process assets with prices and VND values
		const assetsWithPrices = assetsData.map(item => {
			const currentPrice = prices[item.asset.symbol] || null;
			const currentValue = currentPrice && item.totalQuantity > 0
				? currentPrice * item.totalQuantity
				: 0;
			const netInvested = item.totalInvested - item.totalSold;
			const unrealizedPL = currentValue > 0 ? currentValue - netInvested : 0;
			const unrealizedPLPercent = netInvested > 0
				? (unrealizedPL / netInvested) * 100
				: 0;

			const cryptoId = cryptoIdMap[item.asset.symbol.toUpperCase()];
			const logoUrl = cryptoId
				? `https://s2.coinmarketcap.com/static/img/coins/64x64/${cryptoId}.png`
				: null;

			return {
				...item,
				currentPrice,
				currentValue,
				unrealizedPL,
				unrealizedPLPercent,
				logoUrl,
				vnd: {
					currentPrice: currentPrice ? currentPrice * vndConversion.usdToVnd : null,
					currentValue: currentValue * vndConversion.usdToVnd,
					avgBuyPrice: item.avgBuyPrice * vndConversion.usdToVnd,
					unrealizedPL: unrealizedPL * vndConversion.usdToVnd,
					totalInvested: item.totalInvested * vndConversion.usdToVnd,
					totalSold: item.totalSold * vndConversion.usdToVnd,
				}
			};
		});

		// Process portfolio summary
		const portfolio = portfolioSummary[0] || {
			totalInvested: 0,
			totalSold: 0,
			totalFees: 0,
			transactionCount: 0,
			assetCount: 0,
		};

		// Calculate total portfolio value and P&L from assets
		const totalValue = assetsWithPrices.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
		const totalPnL = assetsWithPrices.reduce((sum, asset) => sum + (asset.unrealizedPL || 0), 0);

		return {
			assets: assetsWithPrices,
			portfolio: {
				...portfolio,
				totalValue,
				totalPnL,
				vnd: {
					totalInvested: portfolio.totalInvested * vndConversion.usdToVnd,
					totalSold: portfolio.totalSold * vndConversion.usdToVnd,
					totalFees: portfolio.totalFees * vndConversion.usdToVnd,
					netInvested: (portfolio.totalInvested - portfolio.totalSold) * vndConversion.usdToVnd,
					totalValue: totalValue * vndConversion.usdToVnd,
					totalPnL: totalPnL * vndConversion.usdToVnd,
					exchangeRate: vndConversion.usdToVnd,
					source: vndConversion.source,
				}
			},
			vndRate: vndConversion,
		};
	}),

	// Search cryptocurrencies for dropdown (simplified version without price data)
	searchCryptocurrencies: publicProcedure
		.input(
			z.object({
				query: z.string().optional(),
				limit: z.number().optional().default(20),
				includePrice: z.boolean().optional().default(false), // Option to include price data
			})
		)
		.query(async ({ input }) => {
			try {
				// If CoinMarketCap is configured, use it for comprehensive data
				if (coinMarketCapService.isConfigured()) {
					const allCryptos = await coinMarketCapService.getTopCryptocurrencies(500);

					// Filter based on query
					let filtered = allCryptos;
					if (input.query && input.query.length > 0) {
						const queryLower = input.query.toLowerCase();
						filtered = allCryptos.filter(
							crypto =>
								crypto.symbol.toLowerCase().includes(queryLower) ||
								crypto.name.toLowerCase().includes(queryLower)
						);
					}

					// Return formatted results
					return filtered.slice(0, input.limit).map(crypto => ({
						symbol: crypto.symbol,
						name: crypto.name,
						price: input.includePrice ? crypto.quote.USD.price : null,
						marketCap: input.includePrice ? crypto.quote.USD.market_cap : null,
						rank: crypto.cmc_rank,
						logo: `https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png`,
					}));
				}

				// Fallback: return common cryptocurrencies with basic info
				// Using CoinMarketCap IDs for logo URLs
				const commonCryptos = [
					{ symbol: "BTC", name: "Bitcoin", rank: 1, id: 1 },
					{ symbol: "ETH", name: "Ethereum", rank: 2, id: 1027 },
					{ symbol: "USDT", name: "Tether", rank: 3, id: 825 },
					{ symbol: "BNB", name: "BNB", rank: 4, id: 1839 },
					{ symbol: "XRP", name: "XRP", rank: 5, id: 52 },
					{ symbol: "SOL", name: "Solana", rank: 6, id: 5426 },
					{ symbol: "USDC", name: "USD Coin", rank: 7, id: 3408 },
					{ symbol: "ADA", name: "Cardano", rank: 8, id: 2010 },
					{ symbol: "DOGE", name: "Dogecoin", rank: 9, id: 74 },
					{ symbol: "AVAX", name: "Avalanche", rank: 10, id: 5805 },
					{ symbol: "TRX", name: "TRON", rank: 11, id: 1958 },
					{ symbol: "DOT", name: "Polkadot", rank: 12, id: 6636 },
					{ symbol: "LINK", name: "Chainlink", rank: 13, id: 1975 },
					{ symbol: "MATIC", name: "Polygon", rank: 14, id: 3890 },
					{ symbol: "TON", name: "Toncoin", rank: 15, id: 11419 },
					{ symbol: "ICP", name: "Internet Computer", rank: 16, id: 8916 },
					{ symbol: "SHIB", name: "Shiba Inu", rank: 17, id: 5994 },
					{ symbol: "LTC", name: "Litecoin", rank: 18, id: 2 },
					{ symbol: "BCH", name: "Bitcoin Cash", rank: 19, id: 1831 },
					{ symbol: "UNI", name: "Uniswap", rank: 20, id: 7083 },
					{ symbol: "ATOM", name: "Cosmos", rank: 21, id: 3794 },
					{ symbol: "XLM", name: "Stellar", rank: 22, id: 512 },
					{ symbol: "ETC", name: "Ethereum Classic", rank: 23, id: 1321 },
					{ symbol: "FIL", name: "Filecoin", rank: 24, id: 2280 },
					{ symbol: "APT", name: "Aptos", rank: 25, id: 21794 },
				];

				// Filter based on query
				let filtered = commonCryptos;
				if (input.query && input.query.length > 0) {
					const queryLower = input.query.toLowerCase();
					filtered = commonCryptos.filter(
						crypto =>
							crypto.symbol.toLowerCase().includes(queryLower) ||
							crypto.name.toLowerCase().includes(queryLower)
					);
				}

				// Only fetch prices if requested
				let prices: Record<string, number | null> = {};
				if (input.includePrice) {
					const symbols = filtered.slice(0, input.limit).map(c => c.symbol);
					prices = await priceService.getPrices(symbols);
				}

				return filtered.slice(0, input.limit).map(crypto => ({
					symbol: crypto.symbol,
					name: crypto.name,
					price: input.includePrice ? (prices[crypto.symbol] || null) : null,
					marketCap: null,
					rank: crypto.rank,
					logo: crypto.id ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png` : null,
				}));
			} catch (error) {
				console.error("Error searching cryptocurrencies:", error);
				// Return basic fallback data even on error
				return [
					{ symbol: "BTC", name: "Bitcoin", price: null, marketCap: null, rank: 1, logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png" },
					{ symbol: "ETH", name: "Ethereum", price: null, marketCap: null, rank: 2, logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png" },
					{ symbol: "USDT", name: "Tether", price: null, marketCap: null, rank: 3, logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png" },
				];
			}
		}),
});

export type CryptoRouter = typeof cryptoRouter;