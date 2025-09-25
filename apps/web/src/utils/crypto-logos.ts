// Utility for fetching cryptocurrency logos from CoinMarketCap or other sources

// CoinMarketCap IDs for common cryptocurrencies
const CMC_IDS: Record<string, number> = {
  BTC: 1,
  ETH: 1027,
  USDT: 825,
  BNB: 1839,
  XRP: 52,
  SOL: 5426,
  USDC: 3408,
  ADA: 2010,
  DOGE: 74,
  AVAX: 5805,
  TRX: 1958,
  DOT: 6636,
  LINK: 1975,
  MATIC: 3890,
  POLYGON: 3890,
  POL: 3890,
  TON: 11419,
  ICP: 8916,
  SHIB: 5994,
  LTC: 2,
  BCH: 1831,
  UNI: 7083,
  ATOM: 3794,
  XLM: 512,
  ETC: 1321,
  FIL: 2280,
  APT: 21794,
  ARB: 11841,
  OP: 11840,
  VET: 3077,
  HBAR: 4642,
  NEAR: 6535,
  GRT: 6719,
  ALGO: 4030,
  FTM: 3513,
  SAND: 6210,
  MANA: 1966,
  AXS: 6783,
  AAVE: 7278,
  CRV: 6538,
  SUSHI: 6758,
  CAKE: 7186,
  PEPE: 24478,
  SUI: 20947,
  SEI: 23149,
  INJ: 7226,
  TIA: 22861,
  APE: 18876,
  GALA: 7080,
  CHZ: 4066,
  BLUR: 23121,
  RUNE: 4157,
  IMX: 10603,
  EGLD: 6892,
  FLOW: 4558,
  THETA: 2416,
  XTZ: 2011,
  ASTR: 12885, // Astar Network
  ASTER: 33988, // Aster DEX
  SNX: 2586,
  WLD: 13502,
  RNDR: 5690,
  MKR: 1518,
  COMP: 5692,
  QNT: 3155,
  FET: 3773,
  OCEAN: 3911,
  AGIX: 2424,
  ZIL: 2469,
  KSM: 5034,
  BAT: 1697,
  ZRX: 1896,
  ENJ: 2130,
  ANKR: 3783,
  STORJ: 1772,
  YFI: 5864,
  BAND: 4679,
  BAL: 5728,
  KNC: 1982,
  REN: 2539,
  CTSI: 5444,
  CELO: 5567,
  KAVA: 4846,
  RSR: 3964,
  SKL: 5691,
  PERP: 6950,
  AUDIO: 7455,
  BADGER: 7859,
  FARM: 5816,
  DYDX: 14222,
  RLY: 8075,
  SPELL: 11289,
  ENS: 13855,
  NKN: 2780,
  MLN: 1552,
  C98: 10903,
  CLV: 8384,
  GNO: 1659,
  POLS: 7208,
  SUPER: 8290,
  TLM: 9119,
  PLA: 7461,
  ALICE: 8766,
  DEGO: 8444,
  BAKE: 7192,
  ALPHA: 7232,
  BNT: 1727,
  CELR: 3814,
  CTK: 7064,
  DATA: 2143,
  DIA: 6138,
  DOCK: 2675,
  ERG: 1762,
  FORTH: 9421,
  FUN: 1757,
  GTC: 10052,
  IDEX: 3928,
  IOST: 2405,
  IOTX: 2777,
  IRIS: 3874,
  JOE: 11396,
  JST: 5488,
  KEY: 2398,
  LDO: 8000,
  LINA: 7102,
  LPT: 3640,
  LQTY: 9566,
  LRC: 1934,
  LSK: 1214,
  MDT: 4779,
  MTL: 1788,
  NMR: 1732,
  NU: 7080,
  OGN: 5117,
  OMG: 1808,
  ONG: 3217,
  ONT: 2566,
  OSMO: 12220,
  OXT: 5026,
  PAXG: 4705,
  PHB: 4279,
  PNT: 5425,
  POND: 8764,
  POWR: 2132,
  PRO: 3330,
  QSP: 2213,
  QUICK: 8206,
  RAD: 6843,
  RARE: 11294,
  RAY: 8526,
  REQ: 2071,
  REP: 1104,
  RLC: 1637,
  ROSE: 7653,
  RPL: 2943,
  SCRT: 5604,
  SLP: 5824,
  SOL: 5426,
  SRM: 6187,
  SSV: 12999,
  STMX: 2297,
  STPT: 4006,
  STRAX: 4847,
  STX: 4847,
  SUN: 10147,
  SXP: 4279,
  SYN: 12147,
  T: 17751,
  TKO: 9020,
  TRB: 4944,
  TRIBE: 9025,
  TRU: 7725,
  TVK: 8037,
  TWT: 5742,
  UMA: 5617,
  UNFI: 7672,
  USTC: 7129,
  UTK: 2320,
  VOXEL: 21320,
  VTHO: 3012,
  WAXP: 2300,
  WIN: 4206,
  WOO: 7501,
  WRX: 5161,
  XEC: 10791,
  XEM: 873,
  XMR: 328,
  XNO: 1567,
  XVG: 693,
  XVS: 5954,
  XYO: 2765,
  YGG: 10688,
  ZEC: 1437,
  ZEN: 1698,
  ZKS: 10242,
  STETH: 8085,
  FRAX: 6952,
  LUSD: 9566,
  GUSD: 3306,
  USDP: 3330,
  TUSD: 2563,
  BUSD: 4687,
  DAI: 4943,
  WBTC: 3717,
  WETH: 2396,
  STAKED_ETH: 8085
};

/**
 * Get the CoinMarketCap logo URL for a cryptocurrency
 * @param symbol - The cryptocurrency symbol (e.g., "BTC", "ETH")
 * @param size - The size of the logo (default: 64)
 * @returns The URL to the cryptocurrency logo
 */
export function getCryptoLogo(symbol: string, size: number = 64): string {
  const upperSymbol = symbol.toUpperCase();
  const cmcId = CMC_IDS[upperSymbol];

  if (cmcId) {
    // Use CoinMarketCap's CDN for logos
    return `https://s2.coinmarketcap.com/static/img/coins/${size}x${size}/${cmcId}.png`;
  }

  // Fallback to CryptoLogos API
  // Alternative: https://cryptologos.cc/logos/{symbol}/{symbol}-logo.png
  // Example: https://cryptologos.cc/logos/bitcoin/bitcoin-logo.png
  const cryptoName = getCryptoName(upperSymbol);
  if (cryptoName) {
    return `https://cryptologos.cc/logos/${cryptoName}/${cryptoName}-logo.png`;
  }

  // Final fallback to a placeholder
  return `https://ui-avatars.com/api/?name=${upperSymbol}&background=3b82f6&color=fff&size=${size}`;
}

/**
 * Get the full name for cryptocurrency symbols (for cryptologos.cc)
 */
function getCryptoName(symbol: string): string | null {
  const names: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    BNB: "bnb",
    XRP: "xrp",
    SOL: "solana",
    USDC: "usd-coin",
    ADA: "cardano",
    DOGE: "dogecoin",
    AVAX: "avalanche-2",
    TRX: "tron",
    DOT: "polkadot",
    LINK: "chainlink",
    MATIC: "polygon",
    POLYGON: "polygon",
    POL: "polygon",
    TON: "toncoin",
    ICP: "internet-computer",
    SHIB: "shiba-inu",
    LTC: "litecoin",
    BCH: "bitcoin-cash",
    UNI: "uniswap",
    ATOM: "cosmos",
    XLM: "stellar",
    ETC: "ethereum-classic",
    FIL: "filecoin",
    APT: "aptos",
    ARB: "arbitrum",
    OP: "optimism",
    VET: "vechain",
    HBAR: "hedera",
    NEAR: "near",
    GRT: "the-graph",
    ALGO: "algorand",
    FTM: "fantom",
    SAND: "the-sandbox",
    MANA: "decentraland",
    AXS: "axie-infinity",
    AAVE: "aave",
    CRV: "curve-dao-token",
    SUSHI: "sushi",
    CAKE: "pancakeswap-token"
  };

  return names[symbol] || null;
}

/**
 * Preload a crypto logo to improve performance
 */
export function preloadCryptoLogo(symbol: string, size: number = 64): void {
  const img = new Image();
  img.src = getCryptoLogo(symbol, size);
}

/**
 * Preload multiple crypto logos
 */
export function preloadCryptoLogos(symbols: string[], size: number = 64): void {
  symbols.forEach(symbol => preloadCryptoLogo(symbol, size));
}