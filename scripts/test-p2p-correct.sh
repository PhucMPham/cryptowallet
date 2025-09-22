#!/bin/bash

echo "🧪 Testing P2P API with Correct Format..."

# Test 1: Add transaction (non-batch)
echo -e "\n1️⃣ Adding P2P transaction (non-batch format)..."
curl -s -X POST http://localhost:3003/trpc/p2p.addTransaction \
  -H 'Content-Type: application/json' \
  -d '{"json":{"type":"buy","crypto":"USDT","cryptoAmount":100,"fiatCurrency":"VND","fiatAmount":2550000,"exchangeRate":25500,"transactionDate":"2025-09-22T00:00:00.000Z"}}' | jq '.result.data'

# Test 2: Get transactions
echo -e "\n2️⃣ Getting all P2P transactions..."
curl -s "http://localhost:3003/trpc/p2p.getTransactions" | jq '.result.data | length' | xargs -I {} echo "Found {} transactions"

# Test 3: Get portfolio summary
echo -e "\n3️⃣ Getting portfolio summary..."
ENCODED=$(node -e "console.log(encodeURIComponent(JSON.stringify({json:{crypto:'USDT',fiatCurrency:'VND'}})))")
curl -s "http://localhost:3003/trpc/p2p.getPortfolioSummary?input=$ENCODED" | jq '.result.data.summary | {totalBought, currentHoldings, weightedAverageRate}'

echo -e "\n✅ Test complete!"