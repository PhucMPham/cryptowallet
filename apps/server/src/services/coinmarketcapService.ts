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

interface CryptoMetadata {
	id: number;
	symbol: string;
	name: string;
	logoUrl: string | null;
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
	private metadataCache: Map<string, CryptoMetadata> = new Map();
	private lastMetadataCacheUpdate = 0;

	// Extended static mapping for cryptocurrencies including ASTER
	private staticCryptoMap: Record<string, { id: number; name: string }> = {
		BTC: { id: 1, name: 'Bitcoin' },
		ETH: { id: 1027, name: 'Ethereum' },
		USDT: { id: 825, name: 'Tether' },
		BNB: { id: 1839, name: 'BNB' },
		XRP: { id: 52, name: 'XRP' },
		SOL: { id: 5426, name: 'Solana' },
		USDC: { id: 3408, name: 'USD Coin' },
		ADA: { id: 2010, name: 'Cardano' },
		DOGE: { id: 74, name: 'Dogecoin' },
		AVAX: { id: 5805, name: 'Avalanche' },
		TRX: { id: 1958, name: 'TRON' },
		DOT: { id: 6636, name: 'Polkadot' },
		LINK: { id: 1975, name: 'Chainlink' },
		MATIC: { id: 3890, name: 'Polygon' },
		POLYGON: { id: 3890, name: 'Polygon' },
		POL: { id: 3890, name: 'Polygon' },
		TON: { id: 11419, name: 'Toncoin' },
		ICP: { id: 8916, name: 'Internet Computer' },
		SHIB: { id: 5994, name: 'Shiba Inu' },
		LTC: { id: 2, name: 'Litecoin' },
		BCH: { id: 1831, name: 'Bitcoin Cash' },
		UNI: { id: 7083, name: 'Uniswap' },
		ATOM: { id: 3794, name: 'Cosmos' },
		XLM: { id: 512, name: 'Stellar' },
		ETC: { id: 1321, name: 'Ethereum Classic' },
		FIL: { id: 2280, name: 'Filecoin' },
		APT: { id: 21794, name: 'Aptos' },
		ARB: { id: 11841, name: 'Arbitrum' },
		OP: { id: 11840, name: 'Optimism' },
		VET: { id: 3077, name: 'VeChain' },
		HBAR: { id: 4642, name: 'Hedera' },
		NEAR: { id: 6535, name: 'NEAR Protocol' },
		GRT: { id: 6719, name: 'The Graph' },
		ALGO: { id: 4030, name: 'Algorand' },
		FTM: { id: 3513, name: 'Fantom' },
		SAND: { id: 6210, name: 'The Sandbox' },
		MANA: { id: 1966, name: 'Decentraland' },
		AXS: { id: 6783, name: 'Axie Infinity' },
		AAVE: { id: 7278, name: 'Aave' },
		CRV: { id: 6538, name: 'Curve DAO Token' },
		SUSHI: { id: 6758, name: 'SushiSwap' },
		CAKE: { id: 7186, name: 'PancakeSwap' },
		XTZ: { id: 2011, name: 'Tezos' },
		ASTR: { id: 12885, name: 'Astar' },
		ASTER: { id: 33988, name: 'Aster' }, // Aster DEX token
		STBL: { id: 31566, name: 'STABLE' }, // STABLE token
		PEPE: { id: 24478, name: 'Pepe' },
		SUI: { id: 20947, name: 'Sui' },
		SEI: { id: 23149, name: 'Sei' },
		INJ: { id: 7226, name: 'Injective' },
		TIA: { id: 22861, name: 'Celestia' },
		APE: { id: 18876, name: 'ApeCoin' },
		GALA: { id: 7080, name: 'Gala' },
		CHZ: { id: 4066, name: 'Chiliz' },
		BLUR: { id: 23121, name: 'Blur' },
		RUNE: { id: 4157, name: 'THORChain' },
		IMX: { id: 10603, name: 'Immutable' },
		EGLD: { id: 6892, name: 'MultiversX' },
		FLOW: { id: 4558, name: 'Flow' },
		THETA: { id: 2416, name: 'Theta Network' },
		SNX: { id: 2586, name: 'Synthetix' },
		WLD: { id: 13502, name: 'Worldcoin' },
		RNDR: { id: 5690, name: 'Render' },
		MKR: { id: 1518, name: 'Maker' },
		COMP: { id: 5692, name: 'Compound' },
		QNT: { id: 3155, name: 'Quant' },
		FET: { id: 3773, name: 'Fetch.ai' },
		OCEAN: { id: 3911, name: 'Ocean Protocol' },
		AGIX: { id: 2424, name: 'SingularityNET' },
		// Add more as needed
	};

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

	/**
	 * Get cryptocurrency metadata including logo URL
	 */
	async getCryptoMetadata(symbol: string): Promise<CryptoMetadata | null> {
		const upperSymbol = symbol.toUpperCase();

		// Check cache first
		if (this.metadataCache.has(upperSymbol)) {
			const cached = this.metadataCache.get(upperSymbol);
			if (cached && Date.now() - this.lastMetadataCacheUpdate < this.symbolCacheTimeout) {
				return cached;
			}
		}

		// Try to get from API if configured
		if (this.isConfigured()) {
			try {
				await this.updateSymbolMappings();
				const id = this.symbolToIdCache.get(upperSymbol);
				if (id) {
					// Try to get detailed info from quotes endpoint
					const quote = await this.getDetailedQuote(upperSymbol);
					if (quote) {
						const metadata: CryptoMetadata = {
							id: quote.id,
							symbol: quote.symbol,
							name: quote.name,
							logoUrl: `https://s2.coinmarketcap.com/static/img/coins/64x64/${quote.id}.png`
						};
						this.metadataCache.set(upperSymbol, metadata);
						this.lastMetadataCacheUpdate = Date.now();
						return metadata;
					}
				}
			} catch (error) {
				console.error(`Failed to get metadata from API for ${symbol}:`, error);
			}
		}

		// Fallback to static mapping
		const staticData = this.staticCryptoMap[upperSymbol];
		if (staticData) {
			const metadata: CryptoMetadata = {
				id: staticData.id,
				symbol: upperSymbol,
				name: staticData.name,
				logoUrl: `https://s2.coinmarketcap.com/static/img/coins/64x64/${staticData.id}.png`
			};
			this.metadataCache.set(upperSymbol, metadata);
			return metadata;
		}

		// Try alternative logo sources
		const alternativeLogoUrl = await this.getAlternativeLogoUrl(upperSymbol);
		if (alternativeLogoUrl) {
			const metadata: CryptoMetadata = {
				id: 0, // Unknown ID
				symbol: upperSymbol,
				name: symbol,
				logoUrl: alternativeLogoUrl
			};
			this.metadataCache.set(upperSymbol, metadata);
			return metadata;
		}

		return null;
	}

	/**
	 * Try to get logo from alternative sources
	 */
	private async getAlternativeLogoUrl(symbol: string): Promise<string | null> {
		const lowerSymbol = symbol.toLowerCase();
		const upperSymbol = symbol.toUpperCase();
		
		// Try alternative CDN sources (doesn't require API key)
		const alternativeUrls = [
			`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/128/color/${lowerSymbol}.png`,
			`https://cryptologos.cc/logos/${lowerSymbol}/${lowerSymbol}-logo.png`,
			`https://assets.coingecko.com/coins/images/1/small/${lowerSymbol}.png`,
			// Fallback to a generic avatar with the symbol
			`https://ui-avatars.com/api/?name=${upperSymbol}&background=3b82f6&color=fff&size=128`
		];

		for (const url of alternativeUrls) {
			try {
				// For ui-avatars, we know it will always work
				if (url.includes('ui-avatars.com')) {
					return url;
				}
				
				const response = await fetch(url, { method: 'HEAD' });
				if (response.ok) {
					return url;
				}
			} catch {
				// Continue to next URL
			}
		}

		// This should never happen since ui-avatars is always available
		return `https://ui-avatars.com/api/?name=${upperSymbol}&background=3b82f6&color=fff&size=128`;
	}

	/**
	 * Get logo URL for a cryptocurrency
	 */
	async getLogoUrl(symbol: string): Promise<string | null> {
		const metadata = await this.getCryptoMetadata(symbol);
		return metadata?.logoUrl || null;
	}

	/**
	 * Batch get metadata for multiple symbols
	 */
	async getBatchMetadata(symbols: string[]): Promise<Map<string, CryptoMetadata>> {
		const results = new Map<string, CryptoMetadata>();
		
		// Process in parallel for better performance
		const promises = symbols.map(async (symbol) => {
			const metadata = await this.getCryptoMetadata(symbol);
			if (metadata) {
				results.set(symbol.toUpperCase(), metadata);
			}
		});

		await Promise.all(promises);
		return results;
	}

	/**
	 * Get cryptocurrency data including metadata
	 */
	async getCryptocurrencyData(symbols: string[]): Promise<CMCCryptocurrency[]> {
		try {
			// Ensure symbol mappings are up to date
			await this.updateSymbolMappings();

			const symbolsString = symbols.map(s => s.toUpperCase()).join(',');
			const response = await this.fetchFromAPI('/v1/cryptocurrency/quotes/latest', {
				symbol: symbolsString,
				convert: 'USD',
			});

			const data = response as CMCQuotesResponse;
			return Object.values(data.data);
		} catch (error) {
			console.error('Error fetching cryptocurrency data:', error);
			return [];
		}
	}
}

export const coinMarketCapService = new CoinMarketCapService();
