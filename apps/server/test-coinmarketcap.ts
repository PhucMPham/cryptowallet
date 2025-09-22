#!/usr/bin/env bun

import { coinMarketCapService } from "./src/services/coinmarketcapService";
import { priceService } from "./src/services/priceService";

// Load environment variables
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });

async function testCoinMarketCap() {
	console.log("\n🚀 Testing CoinMarketCap Integration\n");
	console.log("=" .repeat(50));

	// Check configuration
	const isConfigured = coinMarketCapService.isConfigured();
	console.log(`\n✅ Configuration Status: ${isConfigured ? "CONFIGURED" : "NOT CONFIGURED"}`);

	if (!isConfigured) {
		console.log("\n⚠️  To use CoinMarketCap API:");
		console.log("1. Sign up at https://pro.coinmarketcap.com");
		console.log("2. Copy your API key");
		console.log("3. Add to .env file: COINMARKETCAP_API_KEY=your_key_here");
		console.log("\n📝 For testing, you can use the sandbox API:");
		console.log("   - API Key: b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c");
		console.log("   - API URL: https://sandbox-api.coinmarketcap.com");
		console.log("\n");
		return;
	}

	try {
		// Test 1: Single price fetch via price service
		console.log("\n📊 Test 1: Fetching BTC price via price service");
		const btcPrice = await priceService.getPrice("BTC");
		console.log(`   BTC Price: $${btcPrice?.toFixed(2) || "N/A"}`);

		// Test 2: Bulk price fetch
		console.log("\n📊 Test 2: Fetching multiple prices");
		const symbols = ["BTC", "ETH", "BNB", "SOL"];
		const prices = await priceService.getPrices(symbols);
		symbols.forEach(symbol => {
			const price = prices[symbol];
			console.log(`   ${symbol}: $${price?.toFixed(2) || "N/A"}`);
		});

		// Test 3: Direct CoinMarketCap call
		console.log("\n📊 Test 3: Direct CoinMarketCap API call");
		const directPrice = await coinMarketCapService.getPrice("BTC");
		console.log(`   Direct BTC Price: $${directPrice?.toFixed(2) || "N/A"}`);

		// Test 4: Get top cryptocurrencies
		console.log("\n📊 Test 4: Top 5 Cryptocurrencies by Market Cap");
		const topCryptos = await coinMarketCapService.getTopCryptocurrencies(5);
		topCryptos.forEach((crypto, index) => {
			console.log(`   ${index + 1}. ${crypto.symbol} (${crypto.name})`);
			console.log(`      Price: $${crypto.quote.USD.price.toFixed(2)}`);
			console.log(`      Market Cap: $${(crypto.quote.USD.market_cap / 1e9).toFixed(2)}B`);
			console.log(`      24h Change: ${crypto.quote.USD.percent_change_24h.toFixed(2)}%`);
		});

		// Test 5: Provider switching
		console.log("\n📊 Test 5: Provider Switching");
		console.log("   Current provider:", priceService.getProviderStatus().provider);

		priceService.setProvider("coinmarketcap");
		const cmcPrice = await priceService.getPrice("ETH");
		console.log(`   ETH via CoinMarketCap: $${cmcPrice?.toFixed(2) || "N/A"}`);

		priceService.setProvider("coingecko");
		const geckoPrice = await priceService.getPrice("ETH");
		console.log(`   ETH via CoinGecko: $${geckoPrice?.toFixed(2) || "N/A"}`);

		priceService.setProvider("auto");
		console.log("   Provider reset to: auto");

		console.log("\n✅ All tests completed successfully!");

	} catch (error) {
		console.error("\n❌ Test failed:", error);
		if (error instanceof Error) {
			console.error("   Error message:", error.message);
		}
	}

	console.log("\n" + "=".repeat(50));
	console.log("\n💡 Next Steps:");
	console.log("1. Add your CoinMarketCap API key to .env");
	console.log("2. The system will automatically use CoinMarketCap when available");
	console.log("3. Falls back to CoinGecko if CoinMarketCap fails");
	console.log("4. Access test endpoints at http://localhost:3003/trpc");
}

// Run the test
testCoinMarketCap().catch(console.error);