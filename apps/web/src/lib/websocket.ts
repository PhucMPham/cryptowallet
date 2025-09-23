// WebSocket service for real-time crypto price updates
import { toast } from "sonner";

type PriceUpdate = {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
};

type PriceCallback = (update: PriceUpdate) => void;

class CryptoWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscribers: Map<string, Set<PriceCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private symbols: Set<string> = new Set();
  private priceCache: Map<string, PriceUpdate> = new Map();

  constructor() {
    // Initialize connection when first subscriber is added
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      // Using Binance WebSocket for real-time price updates
      // Alternative: wss://stream.coinmarketcap.com/price/latest
      const streamUrl = `wss://stream.binance.com:9443/ws`;
      this.ws = new WebSocket(streamUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        this.subscribeToStreams();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlePriceUpdate(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.handleReconnect();
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      this.handleReconnect();
    }
  }

  private subscribeToStreams() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to ticker streams for tracked symbols
    const streams = Array.from(this.symbols).map(
      symbol => `${symbol.toLowerCase()}usdt@ticker`
    );

    if (streams.length > 0) {
      const subscribeMessage = {
        method: "SUBSCRIBE",
        params: streams,
        id: Date.now()
      };

      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  private handlePriceUpdate(data: any) {
    // Handle Binance ticker update
    if (data.e === "24hrTicker") {
      const symbol = data.s.replace("USDT", "").toUpperCase();
      const update: PriceUpdate = {
        symbol,
        price: parseFloat(data.c), // Current price
        change24h: parseFloat(data.P), // 24h change percent
        volume24h: parseFloat(data.v), // 24h volume
        timestamp: data.E
      };

      // Update cache
      this.priceCache.set(symbol, update);

      // Notify subscribers
      const callbacks = this.subscribers.get(symbol);
      if (callbacks) {
        callbacks.forEach(callback => callback(update));
      }

      // Also notify "all" subscribers
      const allCallbacks = this.subscribers.get("*");
      if (allCallbacks) {
        allCallbacks.forEach(callback => callback(update));
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      toast.error("Lost connection to price feed");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  subscribe(symbol: string, callback: PriceCallback) {
    // Add to subscribers
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    // Track symbol for subscription
    if (symbol !== "*") {
      this.symbols.add(symbol);
    }

    // Connect if not connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    } else {
      // Subscribe to new symbol if already connected
      this.subscribeToStreams();
    }

    // Return cached price if available
    const cached = this.priceCache.get(symbol);
    if (cached) {
      callback(cached);
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(symbol);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(symbol);
          this.symbols.delete(symbol);
        }
      }

      // Disconnect if no more subscribers
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribers.clear();
    this.symbols.clear();
  }

  getLatestPrice(symbol: string): PriceUpdate | null {
    return this.priceCache.get(symbol) || null;
  }
}

// Singleton instance
export const cryptoWebSocket = new CryptoWebSocket();

// React hook for using WebSocket
import { useEffect, useState } from "react";

export function useCryptoPrice(symbol: string | null) {
  const [priceData, setPriceData] = useState<PriceUpdate | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const unsubscribe = cryptoWebSocket.subscribe(symbol, (update) => {
      setPriceData(update);
    });

    return unsubscribe;
  }, [symbol]);

  return priceData;
}

export function useMultipleCryptoPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());

  useEffect(() => {
    if (symbols.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    symbols.forEach(symbol => {
      const unsubscribe = cryptoWebSocket.subscribe(symbol, (update) => {
        setPrices(prev => {
          const newPrices = new Map(prev);
          newPrices.set(update.symbol, update);
          return newPrices;
        });
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [symbols.join(",")]);

  return prices;
}