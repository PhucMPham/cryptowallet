import Database from 'better-sqlite3';

const db = new Database('./apps/server/cryptowallet.db', { readonly: true });

// Query all transactions
const transactions = db.prepare(`
  SELECT 
    ca.symbol,
    ct.type,
    ct.quantity,
    ct.price_per_unit,
    ct.total_amount,
    ct.fee,
    ct.notes
  FROM crypto_transaction ct
  JOIN crypto_asset ca ON ct.asset_id = ca.id
  ORDER BY ca.symbol, ct.transaction_date DESC
`).all();

console.log("Transactions by asset:");
let currentSymbol = '';
transactions.forEach((row: any) => {
  if (row.symbol !== currentSymbol) {
    currentSymbol = row.symbol;
    console.log(`\n=== ${row.symbol} ===`);
  }
  const totalForTx = row.type === 'buy' 
    ? row.total_amount + (row.fee || 0)
    : -(row.total_amount - (row.fee || 0));
  console.log(`  ${row.type}: ${row.quantity} @ $${row.price_per_unit} = $${row.total_amount} (fee: $${row.fee || 0}) => Total: $${totalForTx}`);
  if (row.notes) console.log(`    Note: ${row.notes}`);
});

// Calculate totals
const totals = db.prepare(`
  SELECT 
    SUM(CASE 
      WHEN type = 'buy' 
      THEN total_amount + COALESCE(fee, 0)
      ELSE 0
    END) as total_invested_all,
    SUM(CASE 
      WHEN type = 'sell'
      THEN total_amount - COALESCE(fee, 0)
      ELSE 0
    END) as total_sold
  FROM crypto_transaction
`).get() as any;

console.log("\n=== TOTALS ===");
console.log(`Total Invested (All Buy Transactions): $${totals.total_invested_all || 0}`);
console.log(`Total Sold: $${totals.total_sold || 0}`);
console.log(`Net Invested: $${(totals.total_invested_all || 0) - (totals.total_sold || 0)}`);

// Check for USDT purchases
const usdtPurchases = db.prepare(`
  SELECT COUNT(*) as count, SUM(total_amount) as total
  FROM crypto_transaction
  WHERE notes LIKE '%USDT%' AND type = 'buy'
`).get() as any;

console.log(`\nUSDT Purchases: ${usdtPurchases.count} transactions, Total: $${usdtPurchases.total || 0}`);

db.close();
