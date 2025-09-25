import { db } from "./src/db";
import { cryptoTransaction, cryptoAsset } from "./src/db/schema/crypto";
import { sql, eq, and, desc, or } from "drizzle-orm";

async function analyzeAndFixUsdtTransactions() {
  console.log("Analyzing USDT-related transactions...\n");
  
  try {
    // 1. First, find all USDT sell transactions that correspond to USDT being used as payment
    const usdtAsset = await db
      .select()
      .from(cryptoAsset)
      .where(eq(cryptoAsset.symbol, "USDT"))
      .limit(1);
    
    if (!usdtAsset[0]) {
      console.log("No USDT asset found in database.");
      return;
    }
    
    const usdtAssetId = usdtAsset[0].id;
    
    // Get all USDT sell transactions (these indicate USDT was used to buy something)
    const usdtSells = await db
      .select({
        id: cryptoTransaction.id,
        quantity: cryptoTransaction.quantity,
        totalAmount: cryptoTransaction.totalAmount,
        transactionDate: cryptoTransaction.transactionDate,
        notes: cryptoTransaction.notes,
      })
      .from(cryptoTransaction)
      .where(
        and(
          eq(cryptoTransaction.assetId, usdtAssetId),
          eq(cryptoTransaction.type, "sell")
        )
      )
      .orderBy(desc(cryptoTransaction.transactionDate));
    
    console.log(`Found ${usdtSells.length} USDT sell transactions`);
    
    // For each USDT sell, try to find the corresponding buy transaction
    const buyTransactionsToFix = [];
    
    for (const usdtSell of usdtSells) {
      // Look for buy transactions at the same time with similar amounts
      const correspondingBuys = await db
        .select({
          id: cryptoTransaction.id,
          symbol: cryptoAsset.symbol,
          totalAmount: cryptoTransaction.totalAmount,
          fee: cryptoTransaction.fee,
          quantity: cryptoTransaction.quantity,
          pricePerUnit: cryptoTransaction.pricePerUnit,
          transactionDate: cryptoTransaction.transactionDate,
          notes: cryptoTransaction.notes,
        })
        .from(cryptoTransaction)
        .leftJoin(cryptoAsset, eq(cryptoTransaction.assetId, cryptoAsset.id))
        .where(
          and(
            eq(cryptoTransaction.type, "buy"),
            sql`${cryptoAsset.symbol} != 'USDT'`,
            sql`ABS(julianday(${cryptoTransaction.transactionDate}) - julianday(${usdtSell.transactionDate})) < 0.01`, // Within ~15 minutes
            sql`ABS(${cryptoTransaction.totalAmount} + COALESCE(${cryptoTransaction.fee}, 0) - ${usdtSell.totalAmount}) < 1` // Amount matches (within $1)
          )
        );
      
      if (correspondingBuys.length > 0) {
        buyTransactionsToFix.push(...correspondingBuys);
        correspondingBuys.forEach(buy => {
          console.log(`  USDT Sell: ${usdtSell.quantity} USDT ($${usdtSell.totalAmount}) => Buy: ${buy.quantity} ${buy.symbol} ($${buy.totalAmount})`);
        });
      }
    }
    
    // Also find transactions with USDT in notes or that have totalAmount = 0 (already marked)
    const markedUsdtPurchases = await db
      .select({
        id: cryptoTransaction.id,
        symbol: cryptoAsset.symbol,
        totalAmount: cryptoTransaction.totalAmount,
        fee: cryptoTransaction.fee,
        notes: cryptoTransaction.notes,
      })
      .from(cryptoTransaction)
      .leftJoin(cryptoAsset, eq(cryptoTransaction.assetId, cryptoAsset.id))
      .where(
        and(
          eq(cryptoTransaction.type, "buy"),
          or(
            sql`${cryptoTransaction.notes} LIKE '%USDT%'`,
            sql`${cryptoTransaction.notes} LIKE '%Purchased with USDT%'`
          )
        )
      );
    
    // Check current totals before fix
    const beforeTotals = await db
      .select({
        totalInvested: sql<number>`
          COALESCE(SUM(
            CASE 
              WHEN ${cryptoTransaction.type} = 'buy'
              THEN ${cryptoTransaction.totalAmount} + COALESCE(${cryptoTransaction.fee}, 0)
              ELSE 0
            END
          ), 0)`,
      })
      .from(cryptoTransaction)
      .limit(1);
    
    console.log("\n=== BEFORE FIX ===");
    console.log(`Total Invested: $${beforeTotals[0].totalInvested.toLocaleString()}`);
    
    // Combine all transactions to fix
    const allToFix = [...buyTransactionsToFix, ...markedUsdtPurchases];
    const uniqueToFix = Array.from(new Map(allToFix.map(tx => [tx.id, tx])).values());
    
    console.log(`\n=== TRANSACTIONS TO FIX (${uniqueToFix.length} total) ===`);
    let totalToRemove = 0;
    
    for (const tx of uniqueToFix) {
      if (tx.totalAmount > 0 || (tx.fee && tx.fee > 0)) {
        const amount = tx.totalAmount + (tx.fee || 0);
        totalToRemove += amount;
        console.log(`  ${tx.symbol}: $${tx.totalAmount} + fee $${tx.fee || 0} = $${amount}`);
      }
    }
    
    console.log(`\nTotal to remove from invested: $${totalToRemove.toLocaleString()}`);
    
    // Fix the transactions
    if (uniqueToFix.length > 0) {
      for (const tx of uniqueToFix) {
        await db
          .update(cryptoTransaction)
          .set({ 
            totalAmount: 0,
            fee: 0,
            notes: tx.notes ? 
              (tx.notes.includes("Purchased with USDT") ? tx.notes : `${tx.notes} - Purchased with USDT`) 
              : "Purchased with USDT"
          })
          .where(eq(cryptoTransaction.id, tx.id));
      }
      
      console.log(`\n✅ Updated ${uniqueToFix.length} transactions`);
    }
    
    // Check after fix
    const afterTotals = await db
      .select({
        totalInvested: sql<number>`
          COALESCE(SUM(
            CASE 
              WHEN ${cryptoTransaction.type} = 'buy'
              THEN ${cryptoTransaction.totalAmount} + COALESCE(${cryptoTransaction.fee}, 0)
              ELSE 0
            END
          ), 0)`,
      })
      .from(cryptoTransaction)
      .limit(1);
    
    console.log("\n=== AFTER FIX ===");
    console.log(`Total Invested: $${afterTotals[0].totalInvested.toLocaleString()}`);
    
    const reduction = beforeTotals[0].totalInvested - afterTotals[0].totalInvested;
    console.log(`Reduced by: $${reduction.toLocaleString()}`);
    
    // Convert to VND
    const vndRate = 25000;
    console.log(`\nIn VND (at ${vndRate.toLocaleString()} VND/USD):`);
    console.log(`Total Invested: ${(afterTotals[0].totalInvested * vndRate).toLocaleString()} ₫`);
    
    // If you know your actual cash investment, update this:
    const expectedCashInvestment = 76000; // USD
    console.log(`\nExpected (if cash investment is $${expectedCashInvestment.toLocaleString()}):`);
    console.log(`  ${(expectedCashInvestment * vndRate).toLocaleString()} ₫`);
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

analyzeAndFixUsdtTransactions();