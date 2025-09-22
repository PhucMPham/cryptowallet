interface CMCQuoteLatest {
	price: number;
	volume_24h: number;
	volume_change_24h: number;
	percent_change_1h: number;
	percent_change_24h: number;
	percent_change_7d: number;
	percent_change_30d: number;
	market_cap: number;
	market_cap_dominance: number;
	fully_diluted_market_cap: number;
	last_updated: string;
}

interface CMCCryptocurrency {
	id: number;
	name: string;
	symbol: string;
	slug: string;
	num_market_pairs: number;
	date_added: string;
	tags: string[];
	max_supply: number | null;
	circulating_supply: number;
	total_supply: number;
	platform: any;
	cmc_rank: number;
	last_updated: string;
	quote: {
		USD: CMCQuoteLatest;
	};
}

interface CMCListingsResponse {
	status: {
		timestamp: string;
		error_code: number;
		error_message: string | null;
		elapsed: number;
		credit_count: number;
	};
	data: CMCCryptocurrency[];
}

interface CMCQuotesResponse {
	status: {
		timestamp: string;
		error_code: number;
		error_message: string | null;
		elapsed: number;
		credit_count: number;
	};
	data: {
		[symbol: string]: CMCCryptocurrency;
	};
}

class CoinMarketCapService {
	private apiKey: string;
	private baseUrl: string;
	private cache: Map<string, { data: any; timestamp: number }> = new Map();
	private cacheTimeout = 60000; // 1 minute cache
	private symbolToIdCache: Map<string, number> = new Map();
	private lastSymbolCacheUpdate = 0;
	private symbolCacheTimeout = 3600000; // 1 hour for symbol mapping cache

	constructor() {
		this.apiKey = process.env.COINMARKETCAP_API_KEY || '';
		this.baseUrl = process.env.COINMARKETCAP_API_URL || 'https://pro-api.coinmarketcap.com';

		if (!this.apiKey) {
			console.warn('CoinMarketCap API key not configured. Please set COINMARKETCAP_API_KEY in .env');
		}
	}

	private getCacheKey(endpoint: string, params?: any): string {
		return `${endpoint}:${JSON.stringify(params || {})}`;
	}

	private async fetchFromAPI(endpoint: string, params?: Record<string, any>): Promise<any> {
		if (!this.apiKey) {
			throw new Error('CoinMarketCap API key not configured');
		}

		const cacheKey = this.getCacheKey(endpoint, params);
		const cached = this.cache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		const url = new URL(`${this.baseUrl}${endpoint}`);
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.append(key, String(value));
			});
		}

		try {
			const response = await fetch(url.toString(), {
				headers: {
					'X-CMC_PRO_API_KEY': this.apiKey,
					'Accept': 'application/json',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`CoinMarketCap API error: ${response.statusText} - ${errorText}`);
			}

			const data = await response.json();

			// Check API status
			if (data.status?.error_code !== 0) {
				throw new Error(`CoinMarketCap API error: ${data.status?.error_message || 'Unknown error'}`);
			}

			// Update cache
			this.cache.set(cacheKey, { data, timestamp: Date.now() });

			return data;
		} catch (error) {
			console.error(`Error fetching from CoinMarketCap API:`, error);
			throw error;
		}
	}

	async updateSymbolMappings(): Promise<void> {
		// Update symbol mappings if cache is expired
		if (Date.now() - this.lastSymbolCacheUpdate > this.symbolCacheTimeout) {
			try {
				// Fetch top 500 cryptocurrencies to build symbol mapping
				const response = await this.fetchFromAPI('/v1/cryptocurrency/listings/latest', {
					start: 1,
					limit: 500,
					convert: 'USD',
				});

				const data = response as CMCListingsResponse;

				// Clear and rebuild symbol cache
				this.symbolToIdCache.clear();
				data.data.forEach((crypto) => {
					this.symbolToIdCache.set(crypto.symbol.toUpperCase(), crypto.id);
				});

				this.lastSymbolCacheUpdate = Date.now();
				console.log(`Updated CoinMarketCap symbol mappings: ${this.symbolToIdCache.size} symbols cached`);
			} catch (error) {
				console.error('Failed to update symbol mappings:', error);
			}
		}
	}

	async getPrice(symbol: string): Promise<number | null> {
		try {
			// Ensure symbol mappings are up to date
			await this.updateSymbolMappings();

			const response = await this.fetchFromAPI('/v1/cryptocurrency/quotes/latest', {
				symbol: symbol.toUpperCase(),
				convert: 'USD',
			});

			const data = response as CMCQuotesResponse;
			const cryptoData = data.data[symbol.toUpperCase()];

			if (cryptoData?.quote?.USD?.price) {
				return cryptoData.quote.USD.price;
			}

			return null;
		} catch (error) {
			console.error(`Error fetching price for ${symbol}:`, error);
			return null;
		}
	}

	async getPrices(symbols: string[]): Promise<Record<string, number | null>> {
		const prices: Record<string, number | null> = {};

		try {
			// Ensure symbol mappings are up to date
			await this.updateSymbolMappings();

			// CoinMarketCap allows multiple symbols in one request
			const symbolsString = symbols.map(s => s.toUpperCase()).join(',');
			const response = await this.fetchFromAPI('/v1/cryptocurrency/quotes/latest', {
				symbol: symbolsString,
				convert: 'USD',
			});

			const data = response as CMCQuotesResponse;

			symbols.forEach((symbol) => {
				const upperSymbol = symbol.toUpperCase();
				const cryptoData = data.data[upperSymbol];

				if (cryptoData?.quote?.USD?.price) {
					prices[symbol] = cryptoData.quote.USD.price;
				} else {
					prices[symbol] = null;
				}
			});

			return prices;
		} catch (error) {
			console.error('Error fetching prices:', error);
			// Return null for all symbols on error
			symbols.forEach((symbol) => {
				prices[symbol] = null;
			});
			return prices;
		}
	}

	async getDetailedQuote(symbol: string): Promise<CMCCryptocurrency | null> {
		try {
			// Ensure symbol mappings are up to date
			await this.updateSymbolMappings();

			const response = await this.fetchFromAPI('/v1/cryptocurrency/quotes/latest', {
				symbol: symbol.toUpperCase(),
				convert: 'USD',
			});

			const data = response as CMCQuotesResponse;
			return data.data[symbol.toUpperCase()] || null;
		} catch (error) {
			console.error(`Error fetching detailed quote for ${symbol}:`, error);
			return null;
		}
	}

	async getTopCryptocurrencies(limit: number = 10): Promise<CMCCryptocurrency[]> {
		try {
			const response = await this.fetchFromAPI('/v1/cryptocurrency/listings/latest', {
				start: 1,
				limit,
				convert: 'USD',
				sort: 'market_cap',
				sort_dir: 'desc',
			});

			const data = response as CMCListingsResponse;
			return data.data;
		} catch (error) {
			console.error('Error fetching top cryptocurrencies:', error);
			return [];
		}
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

	// Check if service is properly configured
	isConfigured(): boolean {
		return !!this.apiKey;
	}
}

export const coinMarketCapService = new CoinMarketCapService();