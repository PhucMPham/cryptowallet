const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./apps/server/cryptowallet.db');

// Query all transactions to see totalAmount values
db.all(`
  SELECT 
    ca.symbol,
    ct.type,
    ct.quantity,
    ct.price_per_unit,
    ct.total_amount,
    ct.fee,
    ct.notes,
    ct.transaction_date
  FROM crypto_transaction ct
  JOIN crypto_asset ca ON ct.asset_id = ca.id
  ORDER BY ct.transaction_date DESC
`, [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  
  console.log("All transactions:");
  rows.forEach(row => {
    console.log(`${row.symbol} ${row.type}: ${row.quantity} @ $${row.price_per_unit} = $${row.total_amount} (fee: $${row.fee || 0})`);
    if (row.notes) console.log(`  Note: ${row.notes}`);
  });
  
  // Calculate total invested (only non-USDT purchases)
  db.get(`
    SELECT 
      SUM(CASE 
        WHEN type = 'buy' AND (notes NOT LIKE '%USDT%' OR notes IS NULL)
        THEN total_amount + COALESCE(fee, 0)
        ELSE 0
      END) as total_invested_cash,
      SUM(CASE 
        WHEN type = 'buy'
        THEN total_amount + COALESCE(fee, 0)
        ELSE 0
      END) as total_invested_all
    FROM crypto_transaction
  `, (err, row) => {
    if (err) {
      console.error(err);
    } else {
      console.log("\nTotals:");
      console.log(`Total Invested (Cash only): $${row.total_invested_cash || 0}`);
      console.log(`Total Invested (All): $${row.total_invested_all || 0}`);
    }
    
    db.close();
  });
});
