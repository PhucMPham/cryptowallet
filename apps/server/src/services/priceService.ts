interface CryptoPrice {
	usd: number;
	usd_24h_change?: number;
}

interface PriceResponse {
	[symbol: string]: CryptoPrice;
}

class PriceService {
	private baseUrl = "https://api.coingecko.com/api/v3";
	private cache: Map<string, { price: number; timestamp: number }> = new Map();
	private cacheTimeout = 60000; // 1 minute cache

	// Map common symbols to CoinGecko IDs
	private symbolToId: Record<string, string> = {
		BTC: "bitcoin",
		ETH: "ethereum",
		BNB: "binancecoin",
		XRP: "ripple",
		ADA: "cardano",
		DOGE: "dogecoin",
		SOL: "solana",
		DOT: "polkadot",
		MATIC: "matic-network",
		AVAX: "avalanche-2",
		LINK: "chainlink",
		UNI: "uniswap",
		ATOM: "cosmos",
		LTC: "litecoin",
		ETC: "ethereum-classic",
		XLM: "stellar",
		ALGO: "algorand",
		VET: "vechain",
		FIL: "filecoin",
		TRX: "tron",
		// Add more mappings as needed
	};

	async getPrice(symbol: string): Promise<number | null> {
		try {
			// Check cache first
			const cached = this.cache.get(symbol);
			if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
				return cached.price;
			}

			const coinId = this.symbolToId[symbol.toUpperCase()];
			if (!coinId) {
				console.warn(`No CoinGecko ID mapping for symbol: ${symbol}`);
				return null;
			}

			const response = await fetch(
				`${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch price: ${response.statusText}`);
			}

			const data: PriceResponse = await response.json();
			const price = data[coinId]?.usd;

			if (price) {
				// Update cache
				this.cache.set(symbol, { price, timestamp: Date.now() });
				return price;
			}

			return null;
		} catch (error) {
			console.error(`Error fetching price for ${symbol}:`, error);
			return null;
		}
	}

	async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
		const prices: Record<string, number | null> = {};

		// Fetch prices in parallel
		const pricePromises = symbols.map(async (symbol) => {
			const price = await this.getPrice(symbol);
			return { symbol, price };
		});

		const results = await Promise.all(pricePromises);

		results.forEach(({ symbol, price }) => {
			prices[symbol] = price;
		});

		return prices;
	}

	// Convert fee amount between USD and crypto
	convertFee(
		feeAmount: number,
		fromCurrency: "USD" | "CRYPTO",
		cryptoPrice: number
	): { usdAmount: number; cryptoAmount: number } {
		if (fromCurrency === "USD") {
			return {
				usdAmount: feeAmount,
				cryptoAmount: feeAmount / cryptoPrice,
			};
		} else {
			return {
				usdAmount: feeAmount * cryptoPrice,
				cryptoAmount: feeAmount,
			};
		}
	}
}

export const priceService = new PriceService();