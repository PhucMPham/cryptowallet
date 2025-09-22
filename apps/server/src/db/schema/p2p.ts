import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const p2pTransaction = sqliteTable("p2p_transaction", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	type: text("type", { enum: ["buy", "sell"] }).notNull(),
	crypto: text("crypto").notNull().default("USDT"), // Default to USDT, but extensible
	cryptoAmount: real("crypto_amount").notNull(), // Amount of USDT bought/sold
	fiatCurrency: text("fiat_currency").notNull().default("VND"), // VND, USD, etc.
	fiatAmount: real("fiat_amount").notNull(), // Amount of VND spent/received
	exchangeRate: real("exchange_rate").notNull(), // VND per USDT at time of transaction
	marketRate: real("market_rate"), // Market rate at time of transaction for spread calculation
	spreadPercent: real("spread_percent"), // Percentage difference from market rate
	feeAmount: real("fee_amount"), // Platform fee in fiat currency
	feePercent: real("fee_percent"), // Fee as percentage of transaction
	platform: text("platform"), // Binance P2P, OTC, Bank Transfer, etc.
	counterparty: text("counterparty"), // Seller/buyer name or ID
	paymentMethod: text("payment_method"), // Bank transfer, cash, etc.
	bankName: text("bank_name"), // Bank used for transfer
	transactionId: text("transaction_id"), // Reference/transaction ID
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

// Store current market rates for P&L calculations
export const marketRate = sqliteTable("market_rate", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	crypto: text("crypto").notNull(), // USDT, BTC, etc.
	fiatCurrency: text("fiat_currency").notNull(), // VND, USD, etc.
	rate: real("rate").notNull(), // Current market rate
	source: text("source"), // CoinGecko, Binance, etc.
	timestamp: integer("timestamp", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type P2PTransaction = typeof p2pTransaction.$inferSelect;
export type NewP2PTransaction = typeof p2pTransaction.$inferInsert;
export type MarketRate = typeof marketRate.$inferSelect;
export type NewMarketRate = typeof marketRate.$inferInsert;