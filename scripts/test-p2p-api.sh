#!/bin/bash

echo "🧪 Testing P2P API Endpoints..."

# Add a P2P transaction using proper tRPC batch format
echo -e "\n1️⃣ Adding P2P transaction..."
curl -s -X POST http://localhost:3003/trpc/p2p.addTransaction?batch=1 \
  -H 'Content-Type: application/json' \
  -d '{
    "0": {
      "json": {
        "type": "buy",
        "crypto": "USDT",
        "cryptoAmount": 100,
        "fiatCurrency": "VND",
        "fiatAmount": 2550000,
        "exchangeRate": 25500,
        "platform": "Binance P2P",
        "paymentMethod": "Bank Transfer",
        "transactionDate": "2025-09-22T00:00:00.000Z"
      }
    }
  }' | jq '.[0].result.data'

echo -e "\n2️⃣ Getting all P2P transactions..."
curl -s "http://localhost:3003/trpc/p2p.getTransactions?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D" | jq '.[0].result.data | length' | xargs -I {} echo "Found {} transactions"

echo -e "\n3️⃣ Getting portfolio summary..."
curl -s "http://localhost:3003/trpc/p2p.getPortfolioSummary?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22crypto%22%3A%22USDT%22%2C%22fiatCurrency%22%3A%22VND%22%7D%7D%7D" | jq '.[0].result.data.summary | {totalBought, currentHoldings, weightedAverageRate}'

echo -e "\n✅ P2P API test complete!"