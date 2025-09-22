# tRPC API Testing & Usage Guide

## Understanding tRPC HTTP Protocol

tRPC uses HTTP as transport but has specific conventions for how data is sent and received. This guide explains how to properly test and use tRPC endpoints.

## Request Formats

### 1. GET Requests (for Queries)

For queries without input:
```bash
curl http://localhost:3003/trpc/procedureName
```

For queries with input:
```bash
# URL-encoded JSON in query parameter
curl "http://localhost:3003/trpc/procedureName?input=%7B%22json%22%3A%7B%22key%22%3A%22value%22%7D%7D"
```

### 2. POST Requests (for Mutations)

tRPC mutations expect the input wrapped in a specific structure:

#### Non-batch Format:
```bash
curl -X POST http://localhost:3003/trpc/procedureName \
  -H "Content-Type: application/json" \
  -d '{"json": {"field1": "value1", "field2": "value2"}}'
```

#### Batch Format:
```bash
curl -X POST "http://localhost:3003/trpc/procedureName?batch=1" \
  -H "Content-Type: application/json" \
  -d '{"0": {"json": {"field1": "value1", "field2": "value2"}}}'
```

## Key Points About tRPC

### 1. Input Structure
- All inputs must be wrapped in `{"json": {...}}` for non-batch
- For batch requests, use `{"0": {"json": {...}}}` where "0" is the batch index

### 2. Batch Requests
- Add `?batch=1` to the URL
- Each operation in the batch is indexed: "0", "1", "2", etc.
- Response will be an array matching the request indices

### 3. Type Validation
- tRPC uses Zod schemas for validation
- Numbers must be actual numbers, not strings
- Dates can be strings but need proper transformation in schema

## Common Mistakes & Solutions

### Mistake 1: Wrong Input Format
❌ **Wrong:**
```bash
curl -X POST http://localhost:3003/trpc/addUser \
  -d '{"name": "John", "age": 30}'
```

✅ **Correct:**
```bash
curl -X POST http://localhost:3003/trpc/addUser \
  -d '{"json": {"name": "John", "age": 30}}'
```

### Mistake 2: Batch Format Confusion
❌ **Wrong:**
```bash
curl -X POST "http://localhost:3003/trpc/procedure?batch=1" \
  -d '{"json": {"data": "value"}}'
```

✅ **Correct:**
```bash
curl -X POST "http://localhost:3003/trpc/procedure?batch=1" \
  -d '{"0": {"json": {"data": "value"}}}'
```

### Mistake 3: Type Mismatches
❌ **Wrong:**
```bash
# Sending string instead of number
-d '{"json": {"age": "30"}}'
```

✅ **Correct:**
```bash
# Sending actual number
-d '{"json": {"age": 30}}'
```

## Testing Our P2P Endpoints

### Get All Transactions (Query)
```bash
# Without filters
curl "http://localhost:3003/trpc/p2p.getTransactions"

# With filters (URL-encoded)
curl "http://localhost:3003/trpc/p2p.getTransactions?input=%7B%22json%22%3A%7B%22crypto%22%3A%22USDT%22%7D%7D"
```

### Add Transaction (Mutation)
```bash
# Non-batch format
curl -X POST http://localhost:3003/trpc/p2p.addTransaction \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "type": "buy",
      "crypto": "USDT",
      "cryptoAmount": 100,
      "fiatCurrency": "VND",
      "fiatAmount": 2550000,
      "exchangeRate": 25500,
      "transactionDate": "2025-09-22T00:00:00.000Z"
    }
  }'

# Batch format
curl -X POST "http://localhost:3003/trpc/p2p.addTransaction?batch=1" \
  -H "Content-Type: application/json" \
  -d '{
    "0": {
      "json": {
        "type": "buy",
        "crypto": "USDT",
        "cryptoAmount": 100,
        "fiatCurrency": "VND",
        "fiatAmount": 2550000,
        "exchangeRate": 25500,
        "transactionDate": "2025-09-22T00:00:00.000Z"
      }
    }
  }'
```

### Get Portfolio Summary
```bash
curl "http://localhost:3003/trpc/p2p.getPortfolioSummary?input=%7B%22json%22%3A%7B%22crypto%22%3A%22USDT%22%2C%22fiatCurrency%22%3A%22VND%22%7D%7D"
```

## JavaScript/TypeScript Testing

```javascript
// Using fetch API
async function addP2PTransaction() {
  const response = await fetch('http://localhost:3003/trpc/p2p.addTransaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: {
        type: 'buy',
        crypto: 'USDT',
        cryptoAmount: 100,
        fiatCurrency: 'VND',
        fiatAmount: 2550000,
        exchangeRate: 25500,
        transactionDate: new Date().toISOString()
      }
    })
  });

  const result = await response.json();
  console.log(result);
}
```

## Debugging Tips

1. **Check Server Logs**: Look for validation errors in server console
2. **Verify JSON Structure**: Use `jq` to pretty-print responses
3. **Test GET First**: Queries are simpler to test than mutations
4. **Use Non-Batch First**: Test without batch mode first, then add batching
5. **Validate Types**: Ensure numbers are numbers, not strings

## Response Format

### Success Response
```json
{
  "result": {
    "data": {
      "json": {
        // Your data here
      }
    }
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Error details",
    "code": -32600,
    "data": {
      "code": "BAD_REQUEST",
      "httpStatus": 400
    }
  }
}
```

## URL Encoding Helper

To encode JSON for GET requests:
```javascript
const input = { crypto: "USDT", fiatCurrency: "VND" };
const encoded = encodeURIComponent(JSON.stringify({ json: input }));
console.log(encoded); // Use this in URL
```

## Common HTTP Status Codes

- `200`: Success
- `400`: Bad Request (validation error)
- `404`: Procedure not found
- `500`: Server error

## Best Practices

1. **Always wrap input in `json` key** for tRPC v10+
2. **Use proper Content-Type headers** for POST requests
3. **Handle both single and batch responses** in your code
4. **Validate data types** before sending
5. **Use the tRPC client library** when possible instead of raw HTTP

## References

- [tRPC Documentation](https://trpc.io/docs)
- [tRPC HTTP Protocol](https://trpc.io/docs/rpc)
- [Batch Link Documentation](https://trpc.io/docs/client/links/httpBatchLink)