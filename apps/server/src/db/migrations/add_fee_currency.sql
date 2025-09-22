-- Add fee currency columns to crypto_transaction table
ALTER TABLE crypto_transaction ADD COLUMN fee_currency TEXT DEFAULT 'USD' CHECK(fee_currency IN ('USD', 'CRYPTO'));
ALTER TABLE crypto_transaction ADD COLUMN fee_in_crypto REAL;