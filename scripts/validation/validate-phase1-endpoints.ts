#!/usr/bin/env bun
// Validates: Phase 1 - Portfolio History & Asset Allocation endpoints
// Created: 2025-09-30

const SERVER_URL = "http://localhost:3003";

interface ValidationResult {
	endpoint: string;
	passed: boolean;
	error?: string;
	data?: any;
}

const results: ValidationResult[] = [];

// Helper to test an endpoint
async function testEndpoint(name: string, path: string, expectedFields: string[]) {
	try {
		const response = await fetch(`${SERVER_URL}${path}`);

		if (!response.ok) {
			results.push({
				endpoint: name,
				passed: false,
				error: `HTTP ${response.status}: ${response.statusText}`,
			});
			return;
		}

		const data = await response.json();

		// Check if expected fields exist
		const missingFields = expectedFields.filter(field => {
			const keys = field.split('.');
			let value = data.result?.data;
			for (const key of keys) {
				if (value === undefined || value === null) return true;
				value = value[key];
			}
			return value === undefined;
		});

		if (missingFields.length > 0) {
			results.push({
				endpoint: name,
				passed: false,
				error: `Missing fields: ${missingFields.join(', ')}`,
				data,
			});
			return;
		}

		results.push({
			endpoint: name,
			passed: true,
			data: data.result?.data,
		});
	} catch (error) {
		results.push({
			endpoint: name,
			passed: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

// Main validation
async function validate() {
	console.log('🧪 Validating Phase 1 Backend Endpoints\n');
	console.log(`Server: ${SERVER_URL}\n`);

	// Test 1: getPortfolioHistory endpoint
	console.log('Testing: GET /trpc/crypto.getPortfolioHistory?input={"range":"1W"}');
	await testEndpoint(
		'getPortfolioHistory (1W)',
		'/trpc/crypto.getPortfolioHistory?input={"range":"1W"}',
		[] // Can be empty if no data exists yet
	);

	// Test 2: getPortfolioHistory - different ranges
	console.log('Testing: GET /trpc/crypto.getPortfolioHistory?input={"range":"1M"}');
	await testEndpoint(
		'getPortfolioHistory (1M)',
		'/trpc/crypto.getPortfolioHistory?input={"range":"1M"}',
		[]
	);

	// Test 3: getAssetAllocation endpoint
	console.log('Testing: GET /trpc/crypto.getAssetAllocation');
	await testEndpoint(
		'getAssetAllocation',
		'/trpc/crypto.getAssetAllocation',
		['assets', 'totalValue', 'totalValueVnd']
	);

	// Print results
	console.log('\n📊 Validation Results:\n');

	let passCount = 0;
	let failCount = 0;

	for (const result of results) {
		if (result.passed) {
			passCount++;
			console.log(`✅ ${result.endpoint}`);
			if (result.data) {
				// Show sample of data structure
				if (Array.isArray(result.data)) {
					console.log(`   → Returned ${result.data.length} items`);
				} else if (result.data.assets) {
					console.log(`   → Total Value: $${result.data.totalValue?.toFixed(2) || 0}`);
					console.log(`   → Total Value: ₫${result.data.totalValueVnd?.toLocaleString() || 0}`);
					console.log(`   → Assets: ${result.data.assets?.length || 0}`);
				}
			}
		} else {
			failCount++;
			console.log(`❌ ${result.endpoint}`);
			console.log(`   → Error: ${result.error}`);
		}
	}

	console.log(`\n📈 Summary: ${passCount} passed, ${failCount} failed`);

	// Business logic validation
	const allocationResult = results.find(r => r.endpoint === 'getAssetAllocation');
	if (allocationResult?.passed && allocationResult.data) {
		const { assets, totalValue } = allocationResult.data;

		// Verify percentages add up to ~100%
		if (assets && Array.isArray(assets) && assets.length > 0) {
			const totalPercentage = assets.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0);
			const percentageValid = Math.abs(totalPercentage - 100) < 0.01;

			console.assert(percentageValid, '❌ Asset allocation percentages do not add up to 100%');
			if (percentageValid) {
				console.log('\n✅ Business logic validated: Asset allocation percentages add up correctly');
			}
		} else {
			console.log('\n⚠️  No assets in portfolio - add transactions to see allocation data');
		}
	}

	// Exit with appropriate code
	process.exit(failCount > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
	try {
		const response = await fetch(SERVER_URL, { method: 'HEAD' });
		return true;
	} catch {
		return false;
	}
}

// Run validation
(async () => {
	const serverRunning = await checkServer();
	if (!serverRunning) {
		console.error(`❌ Server not running at ${SERVER_URL}`);
		console.error('   Start server with: bun dev:server');
		process.exit(1);
	}

	await validate();
})();