"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import StockSelector from "@/components/stock-selector"
import PriceChart from "@/components/price-chart"
import { useToast } from "@/hooks/use-toast"
import { setupWebSocket, setupMockWebSocket } from "@/lib/socket"
import TimeframeSelector from "@/components/timeframe-selector"

export type Signal = {
  type: "BUY" | "SELL" | "HOLD"
  price: number
  timestamp: number
}

export type Trade = {
  type: "BUY" | "SELL"
  price: number
  timestamp: number
  quantity: number
}

export type StockData = {
  symbol: string
  name: string
  currentPrice: number
  previousPrice: number
  change: number
  changePercent: number
}

export default function TradingDashboard() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [connected, setConnected] = useState(false)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [profit, setProfit] = useState(0)
  const [profitPercent, setProfitPercent] = useState(0)
  const [initialInvestment, setInitialInvestment] = useState(10000) // Default $10,000 starting point
  const [priceHistory, setPriceHistory] = useState<{ price: number; timestamp: number }[]>([])
  const [signalHistory, setSignalHistory] = useState<Signal[]>([])
  const [timeframe, setTimeframe] = useState<string>("5m") // Default timeframe
  const [useMockData, setUseMockData] = useState(true) // Toggle for using mock data vs real backend
  const { toast } = useToast()

  // Handle stock selection
  const handleStockSelect = (symbol: string) => {
    setSelectedStock(symbol)
    setTrades([])
    setProfit(0)
    setProfitPercent(0)
    setPriceHistory([])
    setSignalHistory([])
    setSignal(null)
  }

  // Handle timeframe selection
  const handleTimeframeSelect = (newTimeframe: string) => {
    setTimeframe(newTimeframe)
    // Reset data when timeframe changes
    setPriceHistory([])
    setSignalHistory([])
  }

  // Connect to WebSocket when stock or timeframe is selected/changed
  useEffect(() => {
    if (!selectedStock) return

    // Choose between mock or real WebSocket
    const setupFn = useMockData ? setupMockWebSocket : setupWebSocket

    const cleanup = setupFn({
      symbol: selectedStock,
      timeframe: timeframe,
      onConnect: () => {
        setConnected(true)
        toast({
          title: "Connected to trading signals",
          description: `Receiving real-time data for ${selectedStock} (${timeframe})`,
        })
      },
      onDisconnect: () => {
        setConnected(false)
        toast({
          title: "Disconnected from trading signals",
          description: "Connection to trading server lost",
          variant: "destructive",
        })
      },
      onMessage: (data) => {
        // Update stock data
        setStockData(data.stockData)

        // Update price history
        setPriceHistory((prev) => [...prev, { price: data.stockData.currentPrice, timestamp: Date.now() }].slice(-100)) // Keep last 100 points

        // Handle signal
        if (data.signal) {
          setSignal(data.signal)
          setSignalHistory((prev) => [...prev, data.signal])

          // Auto-execute trade based on signal
          if (data.signal.type !== "HOLD") {
            const newTrade = {
              type: data.signal.type,
              price: data.stockData.currentPrice,
              timestamp: Date.now(),
              quantity: 1, // Simplified: always trade 1 share
            }

            setTrades((prev) => [...prev, newTrade])

            // Calculate profit
            calculateProfit([...trades, newTrade], data.stockData.currentPrice)

            toast({
              title: `${data.signal.type} Signal`,
              description: `${data.signal.type} ${selectedStock} at $${data.stockData.currentPrice.toFixed(2)}`,
              variant: data.signal.type === "BUY" ? "default" : "destructive",
            })
          }
        } else {
          // Update profit calculation with latest price even without a new trade
          if (trades.length > 0) {
            calculateProfit(trades, data.stockData.currentPrice)
          }
        }
      },
      onError: (error) => {
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive",
        })
      },
    })

    return cleanup
  }, [selectedStock, timeframe, toast, trades, useMockData])

  // Calculate profit from trades and current price
  const calculateProfit = (tradeList: Trade[], currentPrice: number) => {
    let currentProfit = 0
    let position = 0
    let averageEntryPrice = 0
    let totalInvested = 0
    let totalReturned = 0

    tradeList.forEach((trade) => {
      if (trade.type === "BUY") {
        // Update average entry price
        const newShares = trade.quantity
        const newCost = trade.price * newShares
        totalInvested += newCost
        const totalShares = position + newShares
        averageEntryPrice = (averageEntryPrice * position + newCost) / totalShares
        position += newShares
      } else if (trade.type === "SELL") {
        // Calculate profit on sold shares
        const saleValue = trade.price * trade.quantity
        totalReturned += saleValue
        const costBasis = averageEntryPrice * trade.quantity
        currentProfit += saleValue - costBasis
        position -= trade.quantity
      }
    })

    // Add unrealized profit/loss if we still have a position
    if (position > 0) {
      const unrealizedPL = (currentPrice - averageEntryPrice) * position
      currentProfit += unrealizedPL
    }

    // Calculate total profit including realized and unrealized
    const totalValue = totalReturned + position * currentPrice
    const totalCost = initialInvestment
    const profitPercentage = ((totalValue - totalCost) / totalCost) * 100

    setProfit(currentProfit)
    setProfitPercent(profitPercentage)
  }

  // Toggle between mock and real data
  const toggleDataSource = () => {
    setUseMockData(!useMockData)
    if (selectedStock) {
      // Reset and reconnect
      setConnected(false)
      setPriceHistory([])
      setSignalHistory([])
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Select Stock</CardTitle>
            <CardDescription>Choose a stock to receive trading signals</CardDescription>
          </CardHeader>
          <CardContent>
            <StockSelector onSelect={handleStockSelect} selectedStock={selectedStock} />

            {selectedStock && (
              <div className="mt-6">
                <TimeframeSelector onSelect={handleTimeframeSelect} selectedTimeframe={timeframe} />
              </div>
            )}

            {selectedStock && stockData && (
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">{stockData.symbol}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{stockData.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${stockData.currentPrice.toFixed(2)}</p>
                    <p className={`flex items-center ${stockData.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {stockData.change >= 0 ? (
                        <ArrowUp className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDown className="h-4 w-4 mr-1" />
                      )}
                      {stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Connection Status:</span>
                    <Badge variant={connected ? "default" : "destructive"}>
                      {connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={toggleDataSource}
                    >
                      {useMockData ? "Mock Data" : "Spring Boot"}
                    </Badge>
                  </div>
                </div>

                {signal && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-2">Latest Signal:</h4>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={signal.type === "BUY" ? "default" : signal.type === "SELL" ? "destructive" : "outline"}
                        className="text-lg py-1 px-3"
                      >
                        {signal.type}
                      </Badge>
                      <span className="text-sm text-gray-500">{new Date(signal.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Initial Investment:</span>
                      <span className="font-medium">${initialInvestment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Current P&L:</span>
                      <span className={`text-xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${profit.toFixed(2)} ({profitPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!selectedStock && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Select a stock to begin trading</div>
            )}
          </CardContent>
        </Card>

        {selectedStock && trades.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>Your recent trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {trades.map((trade, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border-b last:border-0">
                    <div className="flex items-center">
                      <Badge variant={trade.type === "BUY" ? "default" : "destructive"} className="mr-2">
                        {trade.type}
                      </Badge>
                      <span>
                        {trade.quantity} @ ${trade.price.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:col-span-2">
        {selectedStock ? (
          <Card>
            <CardHeader>
              <CardTitle>Price Chart & Signals</CardTitle>
              <CardDescription>Real-time price movement and trading signals for {timeframe} timeframe</CardDescription>
            </CardHeader>
            <CardContent>
              {priceHistory.length > 0 ? (
                <PriceChart
                  priceData={priceHistory}
                  signalData={signalHistory}
                  trades={trades}
                  symbol={selectedStock}
                  timeframe={timeframe}
                />
              ) : (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading price data...</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h3 className="text-xl font-medium mb-2">No Stock Selected</h3>
                <p>Select a stock from the panel to view price chart and trading signals</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
