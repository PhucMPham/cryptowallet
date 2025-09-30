import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";
import { auth } from "./lib/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db } from "./db";
import { cryptoAsset, cryptoTransaction } from "./db/schema/crypto";
import { p2pTransaction } from "./db/schema/p2p";
import { priceService } from "./services/priceService";
import { CurrencyService } from "./services/currencyService";
import { portfolioHistoryService } from "./services/portfolioHistoryService";
import { sql, eq } from "drizzle-orm";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: (origin) => {
			// Allow multiple Vercel deployment URLs and localhost for development
			const allowedOrigins = [
				'https://cryptowallet-ruby.vercel.app',
				'https://cryptowallet-phucs-projects-174186b3.vercel.app',
				'https://cryptowallet-phamminhphuc1-2745-phucs-projects-174186b3.vercel.app',
				'https://cryptowallet-git-main-phucs-projects-174186b3.vercel.app',
				'http://localhost:3001',
				'http://localhost:3000'
			];

			// Also allow any Vercel preview URLs for this project
			if (origin?.includes('cryptowallet') && origin?.includes('vercel.app')) {
				return origin;
			}

			// Check if origin is in the allowed list
			if (origin && allowedOrigins.includes(origin)) {
				return origin;
			}

			// For production, use the configured CORS_ORIGIN if set
			if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
				return origin;
			}

			// Default to the first allowed origin if no match (for non-browser requests)
			return allowedOrigins[0];
		},
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK - CORS Fixed");
});

const port = process.env.PORT || 3003;

// Hourly portfolio snapshot automation
async function createHourlySnapshot() {
	try {
		console.log("[Scheduler] Creating hourly portfolio snapshot...");

		// Calculate crypto portfolio value (regular transactions only, excluding P2P)
		const assets = await db
			.select({
				totalQuantity: sql<number>`
					COALESCE(SUM(CASE
						WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.quantity}
						WHEN ${cryptoTransaction.type} = 'sell' THEN -${cryptoTransaction.quantity}
					END), 0)
				`,
				symbol: cryptoAsset.symbol,
			})
			.from(cryptoAsset)
			.leftJoin(cryptoTransaction, eq(cryptoAsset.id, cryptoTransaction.assetId))
			.groupBy(cryptoAsset.id, cryptoAsset.symbol)
			.having(sql`SUM(CASE
				WHEN ${cryptoTransaction.type} = 'buy' THEN ${cryptoTransaction.quantity}
				WHEN ${cryptoTransaction.type} = 'sell' THEN -${cryptoTransaction.quantity}
			END) > 0`);

		if (assets.length === 0) {
			console.log("[Scheduler] No assets in portfolio, skipping snapshot");
			return;
		}

		const symbols = assets.map((a) => a.symbol);
		const prices = await priceService.getPrices(symbols);

		let totalValueUsd = 0;
		for (const asset of assets) {
			const price = prices[asset.symbol] || 0;
			const assetValue = asset.totalQuantity * price;
			totalValueUsd += assetValue;
			console.log(`  [Crypto] ${asset.symbol}: ${asset.totalQuantity.toFixed(6)} × $${price.toFixed(2)} = $${assetValue.toFixed(2)}`);
		}

		const vndConversion = await CurrencyService.getUsdToVndRate();
		const totalValueVnd = totalValueUsd * vndConversion.usdToVnd;

		await portfolioHistoryService.createSnapshot(totalValueUsd, totalValueVnd);

		console.log(`[Scheduler] Snapshot created: $${totalValueUsd.toFixed(2)} (₫${totalValueVnd.toLocaleString()})`);
		console.log(`  Total: ${assets.length} crypto assets (P2P excluded)`);
	} catch (error) {
		console.error("[Scheduler] Error creating hourly snapshot:", error);
	}
}

// Run snapshot every 4 hours (14400000ms)
const SNAPSHOT_INTERVAL = 4 * 60 * 60 * 1000;
setInterval(createHourlySnapshot, SNAPSHOT_INTERVAL);

// Create initial snapshot on startup (after 30 seconds)
setTimeout(createHourlySnapshot, 30000);

console.log("[Scheduler] 4-hour portfolio snapshot automation enabled");

export default {
	port,
	fetch: app.fetch,
};

export type { AppRouter } from "./routers/index";
