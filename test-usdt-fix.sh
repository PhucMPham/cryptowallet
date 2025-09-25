#!/bin/bash
echo "Testing USDT purchase fix..."

# Test buying ETH with USDT (should set totalAmount to 0)
curl -X POST http://localhost:3003/trpc/crypto.addTransaction \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "symbol": "ETH",
      "name": "Ethereum",
      "type": "buy",
      "quantity": 0.5,
      "pricePerUnit": 3000,
      "fee": 2,
      "feeCurrency": "USD",
      "paymentSource": "USDT",
      "exchange": "Test",
      "notes": "Test USDT purchase",
      "transactionDate": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
    }
  }' | jq '.'

echo -e "\n\nChecking if totalAmount is 0 for USDT purchase..."
