import { createConnection } from './apps/server/src/db/index.ts';

async function fixUsdtTransactions() {
  console.log("Fixing USDT transactions...");
  
  try {
    // Connect to database
    const { db } = await createConnection();
    
    // First, check current totals
    const beforeResult = await db.exec({
      sql: `SELECT 
        SUM(CASE WHEN type = 'buy' THEN total_amount + COALESCE(fee, 0) ELSE 0 END) as total_invested,
        SUM(CASE WHEN type = 'sell' THEN total_amount - COALESCE(fee, 0) ELSE 0 END) as total_sold
      FROM crypto_transaction`
    });
    
    console.log("Before fix:");
    console.log("Total Invested:", beforeResult.rows[0].total_invested);
    console.log("Total Sold:", beforeResult.rows[0].total_sold);
    
    // Find USDT purchases
    const usdtPurchases = await db.exec({
      sql: `SELECT ct.id, ca.symbol, ct.total_amount, ct.fee, ct.notes
        FROM crypto_transaction ct
        JOIN crypto_asset ca ON ct.asset_id = ca.id
        WHERE ct.type = 'buy' 
          AND ct.notes LIKE '%USDT%'
          AND ca.symbol != 'USDT'`
    });
    
    console.log("\nFound USDT purchases to fix:", usdtPurchases.rows.length);
    usdtPurchases.rows.forEach(row => {
      console.log(`  ${row.symbol}: $${row.total_amount} (fee: $${row.fee}) - ${row.notes}`);
    });
    
    // Update transactions
    const updateResult = await db.exec({
      sql: `UPDATE crypto_transaction
        SET total_amount = 0, fee = 0
        WHERE type = 'buy' 
          AND notes LIKE '%USDT%'
          AND id IN (
            SELECT ct.id
            FROM crypto_transaction ct
            JOIN crypto_asset ca ON ct.asset_id = ca.id
            WHERE ca.symbol != 'USDT' AND ct.type = 'buy'
          )`
    });
    
    console.log("\nUpdated rows:", updateResult.changes);
    
    // Check after fix
    const afterResult = await db.exec({
      sql: `SELECT 
        SUM(CASE WHEN type = 'buy' THEN total_amount + COALESCE(fee, 0) ELSE 0 END) as total_invested,
        SUM(CASE WHEN type = 'sell' THEN total_amount - COALESCE(fee, 0) ELSE 0 END) as total_sold
      FROM crypto_transaction`
    });
    
    console.log("\nAfter fix:");
    console.log("Total Invested:", afterResult.rows[0].total_invested);
    console.log("Total Sold:", afterResult.rows[0].total_sold);
    console.log("Net Invested:", afterResult.rows[0].total_invested - afterResult.rows[0].total_sold);
    
    await db.close();
    console.log("\nDone!");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

fixUsdtTransactions();