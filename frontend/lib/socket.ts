// Replace the entire file with this implementation that connects to a Spring Boot WebSocket

import type { StockData, Signal } from "@/components/trading-dashboard"

interface WebSocketOptions {
  symbol: string
  timeframe: string
  onConnect: () => void
  onDisconnect: () => void
  onMessage: (data: any) => void
  onError: (error: Error) => void
}

export function setupWebSocket(options: WebSocketOptions) {
  const { symbol, timeframe, onConnect, onDisconnect, onMessage, onError } = options

  let socket: WebSocket | null = null

  try {
    // Connect to the Spring Boot WebSocket endpoint
    // Adjust the URL to match your Spring Boot backend
    const wsUrl = `ws://localhost:8080/ws/trading/${symbol}?timeframe=${timeframe}`
    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log(`WebSocket connected for ${symbol} with timeframe ${timeframe}`)
      onConnect()
    }

    socket.onclose = () => {
      console.log("WebSocket disconnected")
      onDisconnect()
    }

    socket.onerror = (error) => {
      console.error("WebSocket error:", error)
      onError(new Error("WebSocket connection error"))
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (err) {
        console.error("Error parsing WebSocket message:", err)
        onError(err instanceof Error ? err : new Error(String(err)))
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }

  // Return cleanup function
  return () => {
    if (socket) {
      socket.close()
    }
  }
}

// Fallback mock implementation for development/testing when Spring Boot is not available
export function setupMockWebSocket(options: WebSocketOptions) {
  const { symbol, timeframe, onConnect, onDisconnect, onMessage, onError } = options

  let lastPrice: number | undefined
  let lastSignal: Signal | null = null
  let lastSignalTime: number | undefined
  let interval: NodeJS.Timeout

  // Base price for each stock
  const basePrices: Record<string, number> = {
    AAPL: 180.5,
    MSFT: 410.2,
    GOOGL: 175.3,
    AMZN: 185.6,
    META: 500.7,
    TSLA: 240.8,
    NVDA: 950.2,
    JPM: 198.4,
    V: 275.9,
    JNJ: 152.3,
  }

  // Adjust update frequency based on timeframe
  const updateFrequency =
    {
      "5m": 1000, // 1 second in demo
      "30m": 2000, // 2 seconds in demo
      "4h": 3000, // 3 seconds in demo
      "1d": 5000, // 5 seconds in demo
    }[timeframe] || 1000

  // Simulate connection delay
  setTimeout(() => {
    try {
      onConnect()

      // Initial data
      const initialStockData = generateMockStockData(symbol)
      lastPrice = initialStockData.currentPrice

      onMessage({
        stockData: initialStockData,
        signal: null,
      })

      // Set up interval to send mock data
      interval = setInterval(() => {
        try {
          // Generate new stock data
          const stockData = generateMockStockData(symbol, lastPrice)
          lastPrice = stockData.currentPrice

          // Generate signal
          const signal = generateSignal(stockData, lastSignal, lastSignalTime)
          if (signal) {
            lastSignal = signal
            lastSignalTime = signal.timestamp
          }

          // Send message
          onMessage({
            stockData,
            signal,
          })
        } catch (err) {
          onError(err instanceof Error ? err : new Error(String(err)))
        }
      }, updateFrequency)
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }, 1000)

  // Return cleanup function
  return () => {
    clearInterval(interval)
    onDisconnect()
  }

  // Mock stock data generator
  function generateMockStockData(symbol: string, lastPrice?: number): StockData {
    // Use the base price or the last price with a small random change
    const basePrice = basePrices[symbol] || 100
    const previousPrice = lastPrice || basePrice

    // Generate a small random price change (-1% to +1%)
    const changePercent = (Math.random() * 2 - 1) * 0.01
    const change = previousPrice * changePercent
    const currentPrice = previousPrice + change

    return {
      symbol,
      name: getStockName(symbol),
      currentPrice,
      previousPrice,
      change,
      changePercent: changePercent * 100,
    }
  }

  // Get stock name from symbol
  function getStockName(symbol: string): string {
    const stockNames: Record<string, string> = {
      AAPL: "Apple Inc.",
      MSFT: "Microsoft Corporation",
      GOOGL: "Alphabet Inc.",
      AMZN: "Amazon.com Inc.",
      META: "Meta Platforms Inc.",
      TSLA: "Tesla Inc.",
      NVDA: "NVIDIA Corporation",
      JPM: "JPMorgan Chase & Co.",
      V: "Visa Inc.",
      JNJ: "Johnson & Johnson",
    }

    return stockNames[symbol] || "Unknown Stock"
  }

  // Generate trading signals based on price movement
  function generateSignal(stockData: StockData, lastSignal?: Signal | null, lastSignalTime?: number): Signal | null {
    // Don't generate signals too frequently (at least 5 seconds apart)
    if (lastSignalTime && Date.now() - lastSignalTime < 5000) {
      return null
    }

    // Simple signal generation logic (for demonstration)
    const random = Math.random()

    // 70% chance of HOLD, 15% chance of BUY, 15% chance of SELL
    let signalType: "BUY" | "SELL" | "HOLD" = "HOLD"

    if (random < 0.15) {
      signalType = "BUY"
    } else if (random < 0.3) {
      signalType = "SELL"
    }

    // Don't repeat the same signal type
    if (lastSignal && signalType === lastSignal.type) {
      return null
    }

    return {
      type: signalType,
      price: stockData.currentPrice,
      timestamp: Date.now(),
    }
  }
}
