/**
 * Vietnamese Number Formatting Utilities
 *
 * Standard:
 * - Thousands separator: . (dot)
 * - Decimal separator: , (comma)
 * - Example: 1.234.567,89
 */

/**
 * Format currency in Vietnamese Dong
 * @param amount - The amount to format
 * @returns Formatted string with VND symbol
 */
export const formatVnd = (amount: number): string => {
  // Handle invalid numbers and undefined/null
  if (!isFinite(amount) || isNaN(amount) || amount === undefined || amount === null) {
    amount = 0;
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format currency in USD with Vietnamese number format
 * @param amount - The amount to format
 * @returns Formatted string with $ symbol
 */
export const formatCurrency = (amount: number): string => {
  // Use Vietnamese locale for number formatting but with USD symbol
  const formatted = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted}`;
};

/**
 * Format number with Vietnamese format
 * @param amount - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (amount: number, decimals: number = 2): string => {
  // Handle very small numbers
  if (amount !== 0 && Math.abs(amount) < 0.01 && decimals < 6) {
    decimals = 6;
  }

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format percentage with Vietnamese format
 * @param value - The percentage value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + "%";
};

/**
 * Parse Vietnamese formatted number to standard number
 * @param value - Vietnamese formatted string (e.g., "1.234.567,89")
 * @returns Parsed number
 */
export const parseVietnameseNumber = (value: string): number => {
  if (!value) return 0;
  // Remove thousand separators (dots) and replace decimal comma with dot
  const cleanValue = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleanValue) || 0;
};

/**
 * Format crypto amount with appropriate decimals
 * @param amount - The crypto amount
 * @param symbol - The crypto symbol (for determining decimals)
 * @returns Formatted string
 */
export const formatCrypto = (amount: number, symbol?: string): string => {
  let decimals = 6; // Default for most cryptos

  // Adjust decimals based on crypto type
  if (symbol) {
    if (["BTC", "ETH"].includes(symbol.toUpperCase())) {
      decimals = 8;
    } else if (["USDT", "USDC", "DAI"].includes(symbol.toUpperCase())) {
      decimals = 2;
    }
  }

  // Use more decimals for very small amounts
  if (amount !== 0 && amount < 0.01) {
    decimals = Math.max(decimals, 8);
  }

  return formatNumber(amount, decimals);
};