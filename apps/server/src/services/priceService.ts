import { coinMarketCapService } from "./coinmarketcapService";

interface CryptoPrice {
	usd: number;
	usd_24h_change?: number;
}

interface PriceResponse {
	[symbol: string]: CryptoPrice;
}

export interface CryptoAssetInfo {
	symbol: string;
	price: number;
	priceChange24h?: number;
	logoUrl?: string;
}

interface CoinGeckoAssetInfo {
	id: string;
	symbol: string;
	name: string;
	image: {
		thumb: string;
		small: string;
		large: string;
	};
	market_data: {
		current_price: {
			usd: number;
		};
		price_change_percentage_24h: number;
	};
}

type PriceProvider = 'coingecko' | 'coinmarketcap' | 'auto';

class PriceService {
	private baseUrl = "https://api.coingecko.com/api/v3";
	private cache: Map<string, { price: number; timestamp: number }> = new Map();
	private cacheTimeout = 60000; // 1 minute cache
	private provider: PriceProvider = 'auto'; // Default to auto-select based on availability

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

	// Set the price provider
	setProvider(provider: PriceProvider) {
		this.provider = provider;
		console.log(`Price provider set to: ${provider}`);
	}

	// Get price from CoinGecko
	private async getPriceFromCoinGecko(symbol: string): Promise<number | null> {
		const coinId = this.symbolToId[symbol.toUpperCase()];
		if (!coinId) {
			console.warn(`No CoinGecko ID mapping for symbol: ${symbol}`);
			return null;
		}

		try {
			const response = await fetch(
				`${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch price: ${response.statusText}`);
			}

			const data: PriceResponse = await response.json();
			return data[coinId]?.usd || null;
		} catch (error) {
			console.error(`CoinGecko error for ${symbol}:`, error);
			return null;
		}
	}

	// Get price from CoinMarketCap
	private async getPriceFromCoinMarketCap(symbol: string): Promise<number | null> {
		if (!coinMarketCapService.isConfigured()) {
			console.warn('CoinMarketCap service not configured');
			return null;
		}

		try {
			return await coinMarketCapService.getPrice(symbol);
		} catch (error) {
			console.error(`CoinMarketCap error for ${symbol}:`, error);
			return null;
		}
	}

	async getPrice(symbol: string): Promise<number | null> {
		try {
			// Check cache first
			const cached = this.cache.get(symbol);
			if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
				return cached.price;
			}

			let price: number | null = null;

			// Select provider based on configuration
			if (this.provider === 'coinmarketcap') {
				price = await this.getPriceFromCoinMarketCap(symbol);
			} else if (this.provider === 'coingecko') {
				price = await this.getPriceFromCoinGecko(symbol);
			} else {
				// Auto mode: try CoinMarketCap first if configured, fallback to CoinGecko
				if (coinMarketCapService.isConfigured()) {
					price = await this.getPriceFromCoinMarketCap(symbol);
				}

				// Fallback to CoinGecko if CoinMarketCap fails or is not configured
				if (price === null) {
					price = await this.getPriceFromCoinGecko(symbol);
				}
			}

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
		// Check if we can use bulk fetch from CoinMarketCap
		if (this.provider === 'coinmarketcap' ||
			(this.provider === 'auto' && coinMarketCapService.isConfigured())) {
			try {
				const cmcPrices = await coinMarketCapService.getPrices(symbols);

				// Check if we got all prices
				const missingSymbols = symbols.filter(s => cmcPrices[s] === null);

				if (missingSymbols.length === 0) {
					// Update cache for all fetched prices
					symbols.forEach((symbol) => {
						if (cmcPrices[symbol]) {
							this.cache.set(symbol, {
								price: cmcPrices[symbol]!,
								timestamp: Date.now()
							});
						}
					});
					return cmcPrices;
				}

				// If some symbols are missing and we're in auto mode, try CoinGecko for those
				if (this.provider === 'auto' && missingSymbols.length > 0) {
					const geckoPromises = missingSymbols.map(async (symbol) => {
						const price = await this.getPriceFromCoinGecko(symbol);
						return { symbol, price };
					});

					const geckoResults = await Promise.all(geckoPromises);
					geckoResults.forEach(({ symbol, price }) => {
						if (price) {
							cmcPrices[symbol] = price;
							this.cache.set(symbol, { price, timestamp: Date.now() });
						}
					});
				}

				return cmcPrices;
			} catch (error) {
				console.error('Error fetching bulk prices from CoinMarketCap:', error);
				// Fall through to individual fetching
			}
		}

		// Fallback to individual fetching
		const prices: Record<string, number | null> = {};
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

	// Get current provider status
	getProviderStatus(): { provider: PriceProvider; coinMarketCapConfigured: boolean } {
		return {
			provider: this.provider,
			coinMarketCapConfigured: coinMarketCapService.isConfigured(),
		};
	}

	// Get detailed asset info including price, 24h change, and logo
	async getAssetInfo(symbol: string): Promise<CryptoAssetInfo | null> {
		const coinId = this.symbolToId[symbol.toUpperCase()];
		if (!coinId) {
			console.warn(`No CoinGecko ID mapping for symbol: ${symbol}`);
			return null;
		}

		try {
			const response = await fetch(
				`${this.baseUrl}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch asset info: ${response.statusText}`);
			}

			const data: CoinGeckoAssetInfo = await response.json();

			return {
				symbol: symbol.toUpperCase(),
				price: data.market_data.current_price.usd,
				priceChange24h: data.market_data.price_change_percentage_24h,
				logoUrl: data.image.large,
			};
		} catch (error) {
			console.error(`Error fetching asset info for ${symbol}:`, error);
			return null;
		}
	}

	// Get detailed info for multiple assets
	async getAssetsInfo(symbols: string[]): Promise<Record<string, CryptoAssetInfo | null>> {
		const results: Record<string, CryptoAssetInfo | null> = {};

		// Fetch in parallel
		const promises = symbols.map(async (symbol) => {
			const info = await this.getAssetInfo(symbol);
			return { symbol, info };
		});

		const responses = await Promise.all(promises);
		responses.forEach(({ symbol, info }) => {
			results[symbol] = info;
		});

		return results;
	}
}

export const priceService = new PriceService();