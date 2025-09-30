# Phase 1 - Manual Test URLs

## Server Must Be Running
Start server: `bun dev:server`

Server URL: http://localhost:3003

---

## 1. Get Portfolio History (1 Week)
**Endpoint:** `getPortfolioHistory`
**Test URL:**
```
http://localhost:3003/trpc/crypto.getPortfolioHistory?input={"range":"1W"}
```

**Expected Response:**
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "totalValueUsd": 82012.14,
        "totalValueVnd": 2167908962.964,
        "snapshotDate": "2025-09-30T07:30:00.000Z"
      }
    ]
  }
}
```

**Note:** Array will be empty if no snapshots have been created yet.

---

## 2. Get Portfolio History (1 Month)
**Endpoint:** `getPortfolioHistory`
**Test URL:**
```
http://localhost:3003/trpc/crypto.getPortfolioHistory?input={"range":"1M"}
```

**Other Time Ranges:**
- 1 Day: `{"range":"1D"}`
- 3 Months: `{"range":"3M"}`
- 1 Year: `{"range":"1Y"}`
- All Time: `{"range":"ALL"}`

---

## 3. Get Asset Allocation
**Endpoint:** `getAssetAllocation`
**Test URL:**
```
http://localhost:3003/trpc/crypto.getAssetAllocation
```

**Expected Response:**
```json
{
  "result": {
    "data": {
      "assets": [
        {
          "symbol": "BTC",
          "name": "Bitcoin",
          "logoUrl": "https://...",
          "quantity": 0.5,
          "currentPrice": 67000,
          "currentValue": 33500,
          "currentValueVnd": 885450000,
          "totalInvested": 30000,
          "totalInvestedVnd": 793200000,
          "percentage": 40.85
        }
      ],
      "totalValue": 82012.14,
      "totalValueVnd": 2167908962.964
    }
  }
}
```

**Validation:**
- `assets` array contains all holdings with quantity > 0
- Each asset has `percentage` field
- All percentages sum to ~100%
- Total values match current portfolio value

---

## Quick Test in Browser

Copy and paste these URLs directly into your browser:

1. **Asset Allocation (most useful):**
   ```
   http://localhost:3003/trpc/crypto.getAssetAllocation
   ```

2. **Portfolio History (1 Week):**
   ```
   http://localhost:3003/trpc/crypto.getPortfolioHistory?input={"range":"1W"}
   ```

3. **Portfolio History (All Time):**
   ```
   http://localhost:3003/trpc/crypto.getPortfolioHistory?input={"range":"ALL"}
   ```

---

## Automated Test Script

Run the validation script:
```bash
bun scripts/validation/validate-phase1-endpoints.ts
```

This will test all endpoints and validate business logic automatically.

---

## Current Status (as of last test)

✅ **getPortfolioHistory** - Working (0 snapshots currently)
✅ **getAssetAllocation** - Working (7 assets, $82,012.14 total)
✅ **Business Logic** - Asset percentages add up correctly to 100%

---

## Next Steps

1. **Create Hourly Snapshot Job** (optional for Phase 1)
   - Set up cron job to call `portfolioHistoryService.createSnapshot()`
   - This will populate portfolio history data over time

2. **Test with Real Data**
   - Add crypto transactions via the app
   - Verify asset allocation updates correctly
   - Check portfolio history after snapshots are created

3. **Move to Phase 2**
   - Build chart components using these endpoints
   - Implement time range filters
   - Add interactive visualizations