"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"
import type { Signal, Trade } from "./trading-dashboard"

interface PriceChartProps {
  priceData: { price: number; timestamp: number }[]
  signalData: Signal[]
  trades: Trade[]
  symbol: string
  timeframe: string
}

export default function PriceChart({ priceData, signalData, trades, symbol, timeframe }: PriceChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (priceData.length === 0) return

    // Combine price data with signals and trades
    const combinedData = priceData.map((point, index) => {
      // Find any signals that occurred at this timestamp (or very close to it)
      const signal = signalData.find(
        (s) => Math.abs(s.timestamp - point.timestamp) < 1000, // Within 1 second
      )

      // Find any trades that occurred at this timestamp
      const trade = trades.find(
        (t) => Math.abs(t.timestamp - point.timestamp) < 1000, // Within 1 second
      )

      // Determine if this point is in profit or loss compared to the last trade
      let profitStatus = null

      if (trades.length > 0) {
        // Find the most recent trade before this point
        const previousTrades = trades.filter((t) => t.timestamp < point.timestamp)

        if (previousTrades.length > 0) {
          const lastTrade = previousTrades[previousTrades.length - 1]

          // If last trade was a buy, we're in profit if current price > buy price
          if (lastTrade.type === "BUY") {
            profitStatus = point.price > lastTrade.price ? "profit" : "loss"
          }
          // If last trade was a sell, we're in profit if current price < sell price
          // (since we'd have sold high and could buy back lower)
          else if (lastTrade.type === "SELL") {
            profitStatus = point.price < lastTrade.price ? "profit" : "loss"
          }
        }
      }

      return {
        price: point.price,
        time: new Date(point.timestamp).toLocaleTimeString(),
        timestamp: point.timestamp,
        signal: signal ? signal.type : null,
        trade: trade ? trade.type : null,
        profitStatus,
      }
    })

    setChartData(combinedData)
  }, [priceData, signalData, trades])

  // Calculate min and max for y-axis
  const minPrice = Math.min(...priceData.map((d) => d.price)) * 0.995
  const maxPrice = Math.max(...priceData.map((d) => d.price)) * 1.005

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-3 bg-white dark:bg-gray-800 shadow-lg border">
          <p className="font-medium">{label}</p>
          <p className="text-green-600 font-medium">${payload[0].value.toFixed(2)}</p>
          {payload[0].payload.trade && (
            <p className={`font-bold mt-1 ${payload[0].payload.trade === "BUY" ? "text-green-600" : "text-red-600"}`}>
              {payload[0].payload.trade} Trade
            </p>
          )}
          {payload[0].payload.signal && !payload[0].payload.trade && (
            <p className={`font-bold mt-1 ${payload[0].payload.signal === "BUY" ? "text-green-600" : "text-red-600"}`}>
              {payload[0].payload.signal} Signal
            </p>
          )}
          {payload[0].payload.profitStatus && (
            <p
              className={`text-sm mt-1 ${payload[0].payload.profitStatus === "profit" ? "text-green-600" : "text-red-600"}`}
            >
              In {payload[0].payload.profitStatus}
            </p>
          )}
        </Card>
      )
    }
    return null
  }

  // Custom dot to show trades
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props

    if (payload.trade) {
      return (
        <svg x={cx - 10} y={cy - 10} width={20} height={20} fill="none" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill={payload.trade === "BUY" ? "rgba(22, 163, 74, 0.7)" : "rgba(220, 38, 38, 0.7)"}
            stroke={payload.trade === "BUY" ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)"}
            strokeWidth="2"
          />
        </svg>
      )
    }
    return null
  }

  // Custom line segments based on profit/loss
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props

    if (payload.trade) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={payload.trade === "BUY" ? "#16a34a" : "#dc2626"}
          stroke="#fff"
          strokeWidth={2}
        />
      )
    }

    return null
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            tickCount={5}
            label={{ value: `Timeframe: ${timeframe}`, position: "insideBottomRight", offset: -10 }}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <Tooltip content={<CustomTooltip />} />

          {/* Profit segments */}
          <Area
            type="monotone"
            dataKey="price"
            stroke="#16a34a"
            fillOpacity={1}
            fill="url(#colorProfit)"
            connectNulls
            activeDot={{ r: 6 }}
            dot={<CustomizedDot />}
            name="Profit"
            isAnimationActive={false}
            strokeWidth={2}
            // Only show for profit segments
            data={chartData.map((item) => (item.profitStatus === "profit" ? item : { ...item, price: null }))}
          />

          {/* Loss segments */}
          <Area
            type="monotone"
            dataKey="price"
            stroke="#dc2626"
            fillOpacity={1}
            fill="url(#colorLoss)"
            connectNulls
            activeDot={{ r: 6 }}
            dot={<CustomizedDot />}
            name="Loss"
            isAnimationActive={false}
            strokeWidth={2}
            // Only show for loss segments
            data={chartData.map((item) => (item.profitStatus === "loss" ? item : { ...item, price: null }))}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
