-- Fix existing USDT purchases to not count towards total invested
-- This updates transactions that were purchased with USDT to have totalAmount = 0

-- First, let's see what we're dealing with
SELECT 
  ca.symbol,
  ct.type,
  ct.total_amount,
  ct.fee,
  ct.notes
FROM crypto_transaction ct
JOIN crypto_asset ca ON ct.asset_id = ca.id
WHERE ct.notes LIKE '%USDT%' AND ct.type = 'buy';

-- Update buy transactions that were made with USDT
-- These are identified by having "Purchased with USDT" in notes
UPDATE crypto_transaction
SET 
  total_amount = 0,
  fee = 0
WHERE 
  type = 'buy' 
  AND notes LIKE '%Purchased with USDT%';

-- Also update any transaction where the note indicates it was a USDT purchase
UPDATE crypto_transaction
SET 
  total_amount = 0,
  fee = 0
WHERE 
  type = 'buy' 
  AND notes LIKE '%USDT%' 
  AND id IN (
    SELECT ct.id
    FROM crypto_transaction ct
    JOIN crypto_asset ca ON ct.asset_id = ca.id
    WHERE ca.symbol != 'USDT' AND ct.type = 'buy'
  );

-- Show the results
SELECT 
  'After fix:' as status,
  SUM(CASE WHEN type = 'buy' THEN total_amount + COALESCE(fee, 0) ELSE 0 END) as total_invested,
  SUM(CASE WHEN type = 'sell' THEN total_amount - COALESCE(fee, 0) ELSE 0 END) as total_sold
FROM crypto_transaction;