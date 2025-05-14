"use client"

import { Button } from "@/components/ui/button"

interface TimeframeSelectorProps {
  onSelect: (timeframe: string) => void
  selectedTimeframe: string
}

export default function TimeframeSelector({ onSelect, selectedTimeframe }: TimeframeSelectorProps) {
  const timeframes = [
    { value: "5m", label: "5m" },
    { value: "30m", label: "30m" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" },
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Select Timeframe</h3>
      <div className="flex space-x-2">
        {timeframes.map((timeframe) => (
          <Button
            key={timeframe.value}
            variant={selectedTimeframe === timeframe.value ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(timeframe.value)}
            className="flex-1"
          >
            {timeframe.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
