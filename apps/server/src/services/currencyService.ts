import { db } from "../db";
import { marketRate } from "../db/schema/p2p";
import { desc, and, eq } from "drizzle-orm";

export interface ConversionRates {
	usdToVnd: number;
	source: string;
	timestamp: Date;
}

export class CurrencyService {
	private static DEFAULT_USD_VND_RATE = 25400; // Fallback rate if no P2P data
	private static CACHE_DURATION_MS = 60000; // 1 minute cache
	private static cache: { rates?: ConversionRates; timestamp?: number } = {};

	/**
	 * Get the current USD to VND conversion rate
	 * Prioritizes P2P market rate, falls back to default
	 */
	static async getUsdToVndRate(): Promise<ConversionRates> {
		// Check cache first
		if (
			this.cache.rates &&
			this.cache.timestamp &&
			Date.now() - this.cache.timestamp < this.CACHE_DURATION_MS
		) {
			return this.cache.rates;
		}

		try {
			// Try to get the latest USDT/VND rate from P2P market rates
			const latestRate = await db
				.select()
				.from(marketRate)
				.where(
					and(
						eq(marketRate.crypto, "USDT"),
						eq(marketRate.fiatCurrency, "VND")
					)
				)
				.orderBy(desc(marketRate.timestamp))
				.limit(1);

			if (latestRate[0]) {
				const rates: ConversionRates = {
					usdToVnd: latestRate[0].rate,
					source: latestRate[0].source || "P2P Market",
					timestamp: latestRate[0].timestamp,
				};

				// Update cache
				this.cache = {
					rates,
					timestamp: Date.now(),
				};

				return rates;
			}
		} catch (error) {
			console.error("Failed to fetch P2P rates:", error);
		}

		// Fallback to default rate
		const defaultRates: ConversionRates = {
			usdToVnd: this.DEFAULT_USD_VND_RATE,
			source: "Default",
			timestamp: new Date(),
		};

		// Cache the default rate too
		this.cache = {
			rates: defaultRates,
			timestamp: Date.now(),
		};

		return defaultRates;
	}

	/**
	 * Convert USD amount to VND
	 */
	static async convertUsdToVnd(usdAmount: number): Promise<{
		vnd: number;
		rate: number;
		source: string;
	}> {
		const rates = await this.getUsdToVndRate();
		return {
			vnd: usdAmount * rates.usdToVnd,
			rate: rates.usdToVnd,
			source: rates.source,
		};
	}

	/**
	 * Convert multiple USD values to VND in batch
	 */
	static async batchConvertUsdToVnd(usdAmounts: number[]): Promise<{
		vndAmounts: number[];
		rate: number;
		source: string;
	}> {
		const rates = await this.getUsdToVndRate();
		return {
			vndAmounts: usdAmounts.map(usd => usd * rates.usdToVnd),
			rate: rates.usdToVnd,
			source: rates.source,
		};
	}

	/**
	 * Format VND currency
	 */
	static formatVnd(amount: number): string {
		return new Intl.NumberFormat("vi-VN", {
			style: "currency",
			currency: "VND",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	}

	/**
	 * Format number with Vietnamese locale
	 */
	static formatNumber(amount: number): string {
		return new Intl.NumberFormat("vi-VN").format(amount);
	}
}