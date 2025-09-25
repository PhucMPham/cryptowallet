import { db } from "./src/db";
import { cryptoTransaction, cryptoAsset } from "./src/db/schema/crypto";
import { sql, eq, and, like, ne } from "drizzle-orm";

async function fixUsdtTransactions() {
  console.log("Fixing USDT transactions in the database...\n");
  
  try {
    // First, check current totals
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
        totalSold: sql<number>`
          COALESCE(SUM(
            CASE 
              WHEN ${cryptoTransaction.type} = 'sell'
              THEN ${cryptoTransaction.totalAmount} - COALESCE(${cryptoTransaction.fee}, 0)
              ELSE 0
            END
          ), 0)`,
      })
      .from(cryptoTransaction)
      .limit(1);
    
    console.log("BEFORE FIX:");
    console.log(`Total Invested: $${beforeTotals[0].totalInvested.toLocaleString()}`);
    console.log(`Total Sold: $${beforeTotals[0].totalSold.toLocaleString()}`);
    console.log(`Net Invested: $${(beforeTotals[0].totalInvested - beforeTotals[0].totalSold).toLocaleString()}`);
    
    // Find USDT purchases (non-USDT assets bought with USDT)
    const usdtPurchases = await db
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
          sql`${cryptoTransaction.notes} LIKE '%USDT%'`,
          sql`${cryptoAsset.symbol} != 'USDT'`
        )
      );
    
    console.log(`\nFound ${usdtPurchases.length} USDT purchases to fix:`);
    let totalToFix = 0;
    usdtPurchases.forEach(tx => {
      const amount = tx.totalAmount + (tx.fee || 0);
      totalToFix += amount;
      console.log(`  ${tx.symbol}: $${tx.totalAmount} + fee $${tx.fee || 0} = $${amount}`);
      if (tx.notes) console.log(`    Note: ${tx.notes}`);
    });
    console.log(`\nTotal amount to remove from invested: $${totalToFix.toLocaleString()}`);
    
    // Update transactions - set totalAmount and fee to 0 for USDT purchases
    if (usdtPurchases.length > 0) {
      const txIds = usdtPurchases.map(tx => tx.id);
      
      for (const txId of txIds) {
        await db
          .update(cryptoTransaction)
          .set({ 
            totalAmount: 0,
            fee: 0 
          })
          .where(eq(cryptoTransaction.id, txId));
      }
      
      console.log(`\nUpdated ${txIds.length} transactions.`);
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
        totalSold: sql<number>`
          COALESCE(SUM(
            CASE 
              WHEN ${cryptoTransaction.type} = 'sell'
              THEN ${cryptoTransaction.totalAmount} - COALESCE(${cryptoTransaction.fee}, 0)
              ELSE 0
            END
          ), 0)`,
      })
      .from(cryptoTransaction)
      .limit(1);
    
    console.log("\nAFTER FIX:");
    console.log(`Total Invested: $${afterTotals[0].totalInvested.toLocaleString()}`);
    console.log(`Total Sold: $${afterTotals[0].totalSold.toLocaleString()}`);
    console.log(`Net Invested: $${(afterTotals[0].totalInvested - afterTotals[0].totalSold).toLocaleString()}`);
    
    const reduction = beforeTotals[0].totalInvested - afterTotals[0].totalInvested;
    console.log(`\n✅ Reduced total invested by: $${reduction.toLocaleString()}`);
    
    // Convert to VND for display
    const vndRate = 25000; // Approximate rate
    console.log(`\nIn VND (at rate ${vndRate.toLocaleString()}):`);
    console.log(`Total Invested: ${(afterTotals[0].totalInvested * vndRate).toLocaleString()} ₫`);
    console.log(`Expected: 1.900.000.000 ₫ (if you invested 76,000 USD cash)`);
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

fixUsdtTransactions();