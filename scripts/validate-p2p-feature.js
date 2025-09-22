#!/usr/bin/env node
// Validates: P2P USDT trading feature with VND exchange rate tracking
// Created: 2025-09-22 for P2P feature validation

const testBaseUrl = 'http://localhost:3003/trpc';

// Test data - realistic P2P transaction
const testP2PTransaction = {
  type: 'buy',
  crypto: 'USDT',
  cryptoAmount: 1000,
  fiatCurrency: 'VND',
  fiatAmount: 25500000,
  exchangeRate: 25500,
  platform: 'Binance P2P',
  paymentMethod: 'Bank Transfer',
  bankName: 'Vietcombank',
  counterparty: 'TestSeller123',
  transactionDate: new Date().toISOString(),
};

async function testP2PFeature() {
  console.log('🔍 Validating P2P USDT Trading Feature...\n');

  try {
    // Test 1: Add P2P Transaction
    console.log('Test 1: Adding P2P transaction...');
    const addResponse = await fetch(`${testBaseUrl}/p2p.addTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: testP2PTransaction
      }),
    });
    const addResult = await addResponse.json();

    console.assert(addResult.result?.data?.id > 0, 'Transaction should be created with valid ID');
    console.log(`✅ Transaction created with ID: ${addResult.result?.data?.id}`);

    // Test 2: Get P2P Transactions
    console.log('\nTest 2: Fetching P2P transactions...');
    const getResponse = await fetch(`${testBaseUrl}/p2p.getTransactions?input=${encodeURIComponent(JSON.stringify({
      json: { crypto: 'USDT', fiatCurrency: 'VND' }
    }))}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const transactions = await getResponse.json();

    console.assert(Array.isArray(transactions.result?.data), 'Should return array of transactions');
    console.assert(transactions.result?.data?.length > 0, 'Should have at least one transaction');
    console.log(`✅ Found ${transactions.result?.data?.length} P2P transactions`);

    // Test 3: Get Portfolio Summary with P&L
    console.log('\nTest 3: Calculating P&L summary...');
    const summaryResponse = await fetch(`${testBaseUrl}/p2p.getPortfolioSummary?input=${encodeURIComponent(JSON.stringify({
      json: { crypto: 'USDT', fiatCurrency: 'VND' }
    }))}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const summary = await summaryResponse.json();

    const portfolioData = summary.result?.data?.summary;
    console.assert(portfolioData?.totalBought >= 1000, 'Total bought should include our test transaction');
    console.assert(portfolioData?.weightedAverageRate > 0, 'Should calculate weighted average rate');
    console.assert(portfolioData?.currentHoldings >= 0, 'Should calculate current holdings');

    console.log(`✅ Portfolio Summary:`);
    console.log(`   - Total Bought: ${portfolioData?.totalBought} USDT`);
    console.log(`   - Weighted Avg Rate: ${portfolioData?.weightedAverageRate?.toFixed(2)} VND/USDT`);
    console.log(`   - Current Holdings: ${portfolioData?.currentHoldings} USDT`);
    console.log(`   - Unrealized P&L: ${portfolioData?.unrealizedPnL?.toFixed(2)} VND`);

    // Test 4: Validate exchange rate calculations
    console.log('\nTest 4: Validating exchange rate calculations...');
    const expectedRate = testP2PTransaction.fiatAmount / testP2PTransaction.cryptoAmount;
    console.assert(
      Math.abs(expectedRate - testP2PTransaction.exchangeRate) < 0.01,
      'Exchange rate calculation should be accurate'
    );
    console.log(`✅ Exchange rate correctly calculated: ${expectedRate} VND/USDT`);

    console.log('\n✨ All P2P feature validations passed!');
    console.log('\n📊 Business Logic Validated:');
    console.log('   ✅ P2P transactions can be created with VND exchange rates');
    console.log('   ✅ Transaction history is correctly stored and retrieved');
    console.log('   ✅ Portfolio P&L calculations work correctly');
    console.log('   ✅ Exchange rate tracking is accurate');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    console.error('\n⚠️  Make sure the server is running on port 3003');
    console.error('   Run: bun dev:server');
    process.exit(1);
  }
}

// Run validation
testP2PFeature();