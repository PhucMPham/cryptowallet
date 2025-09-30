import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const cryptoAsset = sqliteTable("crypto_asset", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	symbol: text("symbol").notNull(), // BTC, ETH, etc.
	name: text("name").notNull(), // Bitcoin, Ethereum, etc.
	logoUrl: text("logo_url"), // Logo image URL from price API
	priceChange24h: real("price_change_24h"), // 24-hour price change percentage
	lastPriceUpdate: integer("last_price_update", { mode: "timestamp" }), // When price was last updated
	userId: text("user_id"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const cryptoTransaction = sqliteTable("crypto_transaction", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	assetId: integer("asset_id")
		.notNull()
		.references(() => cryptoAsset.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["buy", "sell"] }).notNull(),
	quantity: real("quantity").notNull(), // Amount of crypto bought/sold
	pricePerUnit: real("price_per_unit").notNull(), // Price per unit in USD
	totalAmount: real("total_amount").notNull(), // Total USD spent/received
	fee: real("fee").default(0), // Transaction fee in USD (always stored in USD for consistency)
	feeCurrency: text("fee_currency", { enum: ["USD", "CRYPTO"] }).default("USD"), // Currency type for fee
	feeInCrypto: real("fee_in_crypto"), // Original fee amount if paid in crypto
	exchange: text("exchange"), // Binance, Coinbase, etc.
	notes: text("notes"),
	transactionDate: integer("transaction_date", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	userId: text("user_id"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const portfolioHistory = sqliteTable("portfolio_history", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	userId: text("user_id"),
	totalValueUsd: real("total_value_usd").notNull(), // Total portfolio value in USD
	totalValueVnd: real("total_value_vnd").notNull(), // Total portfolio value in VND
	snapshotDate: integer("snapshot_date", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()), // When this snapshot was taken
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type CryptoAsset = typeof cryptoAsset.$inferSelect;
export type NewCryptoAsset = typeof cryptoAsset.$inferInsert;
export type CryptoTransaction = typeof cryptoTransaction.$inferSelect;
export type NewCryptoTransaction = typeof cryptoTransaction.$inferInsert;
export type PortfolioHistory = typeof portfolioHistory.$inferSelect;
export type NewPortfolioHistory = typeof portfolioHistory.$inferInsert;